const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { GoogleGenAI } = require('@google/genai');
const { getActualConfigPath } = require('../config');

function loadAIConfig() {
  let rawConfig = {};
  const configPath = getActualConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      console.warn('[AI Adapter] Could not parse config.json at ' + configPath + ':', e.message);
    }
  }

  const projectConfig = (Array.isArray(rawConfig) ? rawConfig[0] : rawConfig) || {};
  const aiConfig = projectConfig.ai || rawConfig.ai || {};
  const defaultProvider = aiConfig.defaultProvider || 'openai';
  
  const providers = {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || aiConfig.providers?.anthropic?.apiKey || '',
      model: process.env.ANTHROPIC_MODEL || aiConfig.providers?.anthropic?.model || 'claude-3-7-sonnet-latest'
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || aiConfig.providers?.openai?.apiKey || '',
      model: process.env.OPENAI_MODEL || aiConfig.providers?.openai?.model || 'gpt-5-nano'
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || aiConfig.providers?.gemini?.apiKey || '',
      model: process.env.GEMINI_MODEL || aiConfig.providers?.gemini?.model || 'gemini-3.8-flash'
    }
  };

  return { defaultProvider, providers };
}

const PROVIDER_MODELS = {
  gemini: [
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Latest Flash / Recommended)', recommended: true },
    { id: 'gemini-3.8-flash-lite', name: 'Gemini 3.8 Flash Lite (Latest Lite / Fast)' },
    { id: 'gemini-3.8-pro', name: 'Gemini 3.8 Pro (Advanced Reasoning)' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' }
  ],
  openai: [
    { id: 'gpt-5-nano', name: 'GPT-5 Nano (Ultra-fast)', recommended: true },
    { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano (Balanced)' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4o', name: 'GPT-4o (Flagship Multimodal)' },
    { id: 'o3-mini', name: 'o3-mini (Reasoning)' },
    { id: 'o1', name: 'o1 (Complex Reasoning)' }
  ],
  anthropic: [
    { id: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet (Hybrid Reasoning)', recommended: true },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5 (Fast)' },
    { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' }
  ]
};

function getAIStatus() {
  const { defaultProvider, providers } = loadAIConfig();
  const providerList = Object.keys(providers).map(id => ({
    id,
    available: Boolean(providers[id].apiKey),
    model: providers[id].model,
    models: PROVIDER_MODELS[id] || [],
    maskedKey: providers[id].apiKey ? `${providers[id].apiKey.slice(0, 7)}...${providers[id].apiKey.slice(-4)}` : ''
  }));

  return { defaultProvider, providers: providerList, supportedModels: PROVIDER_MODELS };
}

async function anthropicGenerate({ system, prompt, schema, apiKey, model, maxTokens = 8192 }) {
  const client = new Anthropic({ apiKey });
  const resp = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    output_config: { format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: prompt }]
  });
  
  const text = resp.content.find(b => b.type === 'text')?.text || '{}';
  return {
    data: JSON.parse(text),
    usage: {
      inputTokens: resp.usage?.input_tokens || 0,
      outputTokens: resp.usage?.output_tokens || 0
    }
  };
}

async function openaiGenerate({ system, prompt, schema, apiKey, model, maxTokens = 8192 }) {
  const openai = new OpenAI({ apiKey });

  // Model capabilities check
  const isModern = model.startsWith('o1') || model.startsWith('o3') || model.startsWith('gpt-4o') || model.startsWith('gpt-5');
  const supportsStructured = isModern || model.includes('2024-08-06');

  const params = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt }
    ]
  };

  // 1. Handle tokens parameter (modern vs legacy)
  if (isModern) {
    params.max_completion_tokens = maxTokens;
  } else {
    params.max_tokens = maxTokens;
  }

  // 2. Handle response format
  if (supportsStructured) {
    params.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'structured_output',
        strict: false,
        schema
      }
    };
  } else {
    // Fallback for older models that support JSON Mode but not json_schema
    params.response_format = { type: 'json_object' };
    params.messages[0].content += "\n\nIMPORTANT: You must return valid JSON that follows this schema: " + JSON.stringify(schema);
  }

  const resp = await openai.chat.completions.create(params);

  const text = resp.choices[0]?.message?.content || '{}';
  return {
    data: JSON.parse(text),
    usage: {
      inputTokens: resp.usage?.prompt_tokens || 0,
      outputTokens: resp.usage?.completion_tokens || 0
    }
  };
}

async function geminiGenerate({ system, prompt, schema, apiKey, model }) {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: system,
      responseMimeType: 'application/json',
      responseSchema: schema
    }
  });

  const text = response.text || '{}';
  return {
    data: JSON.parse(text),
    usage: {
      inputTokens: response.usageMetadata?.promptTokenCount || 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount || 0
    }
  };
}

async function generateJSON({ system, prompt, schema, provider, customModel, customApiKey, maxTokens = 8192 }) {
  const { defaultProvider, providers } = loadAIConfig();
  const selectedProvider = provider || defaultProvider;
  const pConfig = providers[selectedProvider] || {};
  
  const activeModel = customModel || pConfig.model;
  let result;

  const envKeyName = `${selectedProvider.toUpperCase()}_API_KEY`;
  const apiKey = customApiKey || pConfig.apiKey || process.env[envKeyName] || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(`AI Provider "${selectedProvider}" API key is missing. Please save an API key in Config -> AI & ASO Configuration or set ${envKeyName} in environment.`);
  }

  if (selectedProvider === 'anthropic') {
    result = await anthropicGenerate({ system, prompt, schema, apiKey, model: activeModel, maxTokens });
  } else if (selectedProvider === 'openai') {
    result = await openaiGenerate({ system, prompt, schema, apiKey, model: activeModel, maxTokens });
  } else if (selectedProvider === 'gemini') {
    result = await geminiGenerate({ system, prompt, schema, apiKey, model: activeModel });
  } else {
    throw new Error(`Unsupported AI provider: ${selectedProvider}`);
  }

  return {
    ...result,
    provider: selectedProvider,
    model: activeModel
  };
}

module.exports = {
  loadAIConfig,
  getAIStatus,
  generateJSON,
  PROVIDER_MODELS
};
