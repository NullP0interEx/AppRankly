function isApplePlatform(platform) {
  if (!platform) return false;
  const p = String(platform).toLowerCase();
  return p === 'apple' || p === 'ios';
}

const IOS_AUDIT_SYSTEM_PROMPT = `You are an elite App Store Optimization (ASO) auditor and mobile conversion rate specialist for the Apple App Store (iOS).
Your task is to conduct an exhaustive, rigorous audit of the provided iOS app listing metadata strictly grounded in Apple's indexing algorithms, App Store ranking factors, and conversion psychology.

=== APPLE APP STORE (iOS) RANKING & INDEXING RULES ===
1. APP NAME / TITLE (Max 30 characters):
   - Highest search index weight in the entire listing.
   - Recommended structure: Brand Name followed by a separator (colon or dash) and 1-2 highest-intent search queries.
   - Efficiency: Aim for 25-30 characters without truncation. Avoid generic or low-intent words.
2. SUBTITLE (Max 30 characters):
   - Equal ranking weight to the title.
   - CRITICAL RULE: NEVER repeat words already present in the App Name! Apple combines unique terms from App Name, Subtitle, and Keyword Field to form searchable search query permutations. Repeating words wastes precious character budget without any ranking boost.
   - Must deliver a distinct secondary benefit or high-intent search query.
3. KEYWORD FIELD (Max 100 characters - private in App Store Connect):
   - Indexed for search. Comma-separated, no spaces between terms, singular forms only (Apple automatically stems plurals), no duplicate words from Title or Subtitle, no category names or competitor trademarks.
4. PROMOTIONAL TEXT (Max 170 characters):
   - NOT indexed by Apple's search algorithm!
   - Appears at the very top of the description before the "more" fold. Can be updated at any time without submitting a new app build.
   - Evaluate strictly as a high-conversion marketing hook, urgency driver, social proof badge, or seasonal update announcement.
5. FULL DESCRIPTION (Max 4,000 characters):
   - CRITICAL: Apple App Store search DOES NOT INDEX the full description! (Unlike Google Play).
   - Do NOT advise keyword stuffing in the description.
   - Evaluate strictly for Conversion Rate Optimization (CRO): compelling first 3 lines (visible before "More"), clear user benefits, scannable bullet points, social proof, awards, and a clear call-to-action (CTA).
6. SCREENSHOTS & APP PREVIEW (Up to 10 slots):
   - The first 3 portrait screenshots (or 1 landscape) appear directly in App Store search results alongside the icon and title.
   - Must showcase core value proposition immediately with legible benefit captions.
7. RATINGS & SOCIAL PROOF:
   - High average rating (>4.5) and rating volume strongly influence search rank velocity, category charts, and browse conversion.
8. WHAT'S NEW / RELEASE NOTES:
   - Communicates active development, bug fixes, and feature velocity to prospective and returning users.

=== STRICT AUDIT SCORING ENGINE & ANTI-INFLATION DIRECTIVE (0-100) ===
CRITICAL: Grade as an uncompromising, senior ASO auditor. DO NOT INFLATE SCORES!
- DO NOT default to scores in the 90s! The median app listing on the App Store scores between 60 and 75 out of 100.
- A score of 95-100 means the listing is in the top 0.1% of all apps in existence, leaving practically zero room for improvement.
- An above-average listing scores between 76 and 85.
- Scores above 88 are rare and reserved ONLY for apps that maximize character budgets with high-volume keywords, have zero redundant terms, structured benefit-driven descriptions, and complete visual assets.
- If the listing has ANY high-impact improvement, the score MUST NOT exceed 84.
- If the listing has 2 or more high-impact improvements, the score MUST NOT exceed 76.

Calculate the score by strictly adding points across these 5 pillars (0-100 total):
1. Title Optimization (0-25 pts):
   - 25-30 chars with Brand + high-intent search queries: 20-25 pts.
   - Title < 20 chars or brand-only with no category terms: deduct 8-12 pts.
   - Title > 30 chars (truncation/rejection penalty): deduct 15 pts.
2. Subtitle Optimization (0-25 pts):
   - 25-30 chars with distinct, non-redundant search queries: 20-25 pts.
   - ZERO TOLERANCE FOR REDUNDANCY: If subtitle repeats ANY word from Title, deduct 10-15 pts!
   - Missing subtitle: 0/25 pts. Subtitle < 18 chars: deduct 10 pts. Subtitle > 30 chars: deduct 15 pts.
3. Description & Conversion Copy (0-20 pts):
   - Strong hook in first 3 lines, 4-6 scannable bullet points, social proof, clear CTA: 16-20 pts.
   - Unformatted wall of text without bullets: deduct 6-8 pts.
   - Thin content (<500 chars): deduct 8-10 pts.
4. Visual Assets & Merchandising (0-15 pts):
   - First 3 search screenshots legibility, clear value callouts, 6+ screenshot slots used: 12-15 pts.
   - Under 4 screenshots used: deduct 5-8 pts.
5. Ratings & Social Proof (0-15 pts):
   - Rating >= 4.5 and 100+ ratings: 13-15 pts.
   - Rating 4.0-4.4: 9-12 pts.
   - Rating < 4.0: 3-6 pts.
   - Low rating volume (<20 ratings): deduct 4 pts.

Return structured JSON matching the provided schema. Provide specific, actionable improvements with exact character counts and concrete copy suggestions.`;

const PLAY_AUDIT_SYSTEM_PROMPT = `You are an elite App Store Optimization (ASO) auditor and mobile conversion rate specialist for the Google Play Store (Android).
Your task is to conduct an exhaustive, rigorous audit of the provided Android app listing metadata strictly grounded in Google Play Store indexing algorithms, Google NLP semantic search, and conversion psychology.

=== GOOGLE PLAY STORE (ANDROID) RANKING & INDEXING RULES ===
1. APP TITLE (Max 30 characters):
   - Highest search index weight.
   - Recommended structure: Brand Name + primary category keyword descriptor.
   - Efficiency: Aim for 25-30 characters. Never exceed 30 chars (causes store rejection or truncation). Avoid emojis and promotional claims like "Best" or "#1" (violates Google Play policy).
2. SHORT DESCRIPTION (Max 80 characters):
   - Heavily indexed by Google Play search algorithm.
   - Displayed above the fold on the app listing page and in search card previews.
   - Must combine top secondary keywords with an engaging user benefit and call-to-action. Aim for 70-80 characters without filler.
3. FULL DESCRIPTION (Max 4,000 characters):
   - CRITICAL: HEAVILY INDEXED by Google's Natural Language Processing (NLP) search algorithm!
   - Keyword density: Optimal target is 2% to 3% for primary keyword clusters. Avoid keyword stuffing (Google penalizes repetitive keyword lists).
   - Structure for conversion and crawling:
     * Hook paragraph: First 167 characters appear above the fold on store listing.
     * Feature bullet points: 5-8 bulleted features highlighting user benefits.
     * Social proof & credentials: User numbers, media mentions, certifications.
     * Clear call to action (CTA).
4. SOCIAL PROOF & INSTALL BRACKETS:
   - Public download tier (e.g. 100K+, 1M+) and continuous rating score/volume are massive ranking and conversion drivers on Google Play.
5. VISUAL ASSETS & MERCHANDISING:
   - Feature Graphic / Header Image (1024x500): Mandatory for being featured in Google Play collections and promo spots.
   - Screenshots: 2-8 slots per device. First 3 must convey core functionality with clear text callouts.
6. WHAT'S NEW / RECENT CHANGES:
   - Critical for retaining existing users and highlighting active development.
7. POLICY COMPLIANCE:
   - Strictly follow Google Play Metadata Policy (no incentivized claims, no competitor brand names, accurate content rating).

=== STRICT AUDIT SCORING ENGINE & ANTI-INFLATION DIRECTIVE (0-100) ===
CRITICAL: Grade as an uncompromising, senior ASO auditor. DO NOT INFLATE SCORES!
- DO NOT default to scores in the 90s! The median app listing on Google Play scores between 60 and 75 out of 100.
- A score of 95-100 means the listing is in the top 0.1% of all apps in existence, leaving practically zero room for improvement.
- An above-average listing scores between 76 and 85.
- Scores above 88 are rare and reserved ONLY for apps with optimal character utilization, strong NLP keyword coverage, complete visual sets, and top install proof.
- If the listing has ANY high-impact improvement, the score MUST NOT exceed 84.
- If the listing has 2 or more high-impact improvements, the score MUST NOT exceed 76.

Calculate the score by strictly adding points across these 5 pillars (0-100 total):
1. Title Optimization (0-25 pts):
   - 25-30 chars with Brand + primary category keyword descriptor: 20-25 pts.
   - Title < 20 chars or brand-only with no category keywords: deduct 8-12 pts.
   - Title > 30 chars (causes Play Store rejection/truncation): deduct 15 pts.
   - Promotional words like 'Best', '#1', 'Top' in title: deduct 10 pts (violates Play Metadata Policy).
2. Short Description Optimization (0-25 pts):
   - 65-80 chars combining secondary keywords with strong user action hook: 20-25 pts.
   - Short description < 50 chars: deduct 8-12 pts.
   - Short description missing: 0/25 pts. Short description > 80 chars: deduct 15 pts.
3. Full Description & Google NLP Coverage (0-20 pts):
   - Structured headers, 5-8 bullet points, natural 2-3% keyword density, clear CTA: 16-20 pts.
   - Unformatted wall of text without bullets: deduct 6-8 pts.
   - Thin description (<800 chars): deduct 8-10 pts.
4. Feature Graphic & Visuals (0-15 pts):
   - 1024x500 Feature Graphic present (+5 pts, missing: 0 pts - critical for store featuring).
   - Screenshot count >= 6 (+10 pts, under 4 screenshots: deduct 5-8 pts).
5. Ratings & Install Tier (0-15 pts):
   - Rating >= 4.5 and 100+ ratings: 10-12 pts. Rating 4.0-4.4: 7-9 pts. Rating < 4.0: 2-5 pts.
   - High install tier (100K+): +3 pts. Low review volume (<20): deduct 3 pts.

Return structured JSON matching the provided schema. Provide specific, actionable improvements with exact character counts and concrete copy suggestions.`;

const UNIFIED_AUDIT_SYSTEM_PROMPT = `You are an elite App Store Optimization (ASO) auditor and mobile conversion rate specialist for both Apple App Store and Google Play Store.
Your task is to conduct an in-depth, rigorous audit of the provided app listing metadata strictly based on the target store platform's ranking algorithms, indexing mechanics, and conversion best practices.

Evaluate keyword placement, character limit efficiency, clarity of hooks, balance of features vs benefits, visual asset usage, and social proof.
Adhere strictly to platform-specific indexing rules:
- Google Play: Title (30c) and Short Description (80c) are heavily indexed. Full Description (4000c) is HEAVILY INDEXED by Google NLP (2-3% keyword density target, structured headers & bullet points).
- Apple App Store: Title (30c) and Subtitle (30c) have highest search weight. NEVER repeat words between Title and Subtitle. Full Description is NOT indexed in App Store search (evaluate strictly for CRO, structure, and social proof). Promotional Text (170c) is unindexed conversion hook.

=== STRICT AUDIT SCORING ENGINE & ANTI-INFLATION DIRECTIVE (0-100) ===
CRITICAL: Grade strictly and objectively. Avoid grade inflation:
- Median published store apps score between 60 and 75.
- Above-average listings score between 76 and 85.
- Scores above 88 are reserved only for near-flawless listings.
- If you find 1 high-impact issue, maximum score is 84. If 2+ high-impact issues, maximum score is 76.
Sum scores across 5 pillars (Title: 25, Subtitle/ShortDesc: 25, Description: 20, Visuals: 15, Ratings: 15).

Return structured JSON matching the provided schema. Provide specific, actionable improvements with exact character counts and concrete copy suggestions.`;

function getAuditSystemPrompt(platform) {
  if (isApplePlatform(platform)) return IOS_AUDIT_SYSTEM_PROMPT;
  if (platform) return PLAY_AUDIT_SYSTEM_PROMPT;
  return UNIFIED_AUDIT_SYSTEM_PROMPT;
}

function buildAuditUserPrompt({
  platform = 'play',
  metadata = {},
  packageName = '',
  focusArea = '',
  liveTelemetry = null,
  customListingText = ''
}) {
  if (customListingText && customListingText.trim()) {
    let result = customListingText.trim();
    if (liveTelemetry) {
      result += `\n\n=== LIVE PERFORMANCE TELEMETRY ===\n` +
        `Daily User Installs: ${liveTelemetry.installs ?? 0}\n` +
        `Daily User Uninstalls: ${liveTelemetry.uninstalls ?? 0}\n` +
        `Active Devices: ${liveTelemetry.activeDevices ?? 0}\n` +
        `App Health Score: ${liveTelemetry.healthScore ?? 'N/A'}/100`;
    }
    return result;
  }

  const isIos = isApplePlatform(platform);
  const targetPlatform = isIos ? 'Apple App Store (iOS)' : 'Google Play Store (Android)';
  const focus = focusArea || 'Metadata optimization, character limit efficiency & keyword discovery';

  let screenshotsCount = 0;
  if (Array.isArray(metadata?.screenshots)) {
    screenshotsCount = metadata.screenshots.length;
  } else if (typeof metadata?.screenshots_json === 'string') {
    try {
      const parsed = JSON.parse(metadata.screenshots_json);
      if (Array.isArray(parsed)) screenshotsCount = parsed.length;
    } catch (_) {}
  }

  let prompt = `Audit the following ${targetPlatform} app listing against store conversion, indexing algorithms, and keyword discovery best practices.\n\n`;
  prompt += `Focus Area: ${focus}\n\n`;
  prompt += `=== STORE LISTING METADATA (${targetPlatform.toUpperCase()}) ===\n`;

  if (isIos) {
    const title = (metadata?.title || metadata?.trackName || packageName || '').trim();
    const bundleId = metadata?.bundleId || metadata?.trackId || packageName || 'N/A';
    const developer = metadata?.developer || metadata?.sellerName || metadata?.artistName || 'N/A';
    const category = metadata?.category || metadata?.primaryGenreName || 'N/A';
    const subtitle = (metadata?.subtitle || '').trim();
    const promoText = (metadata?.promotionalText || '').trim();
    const desc = (metadata?.description || metadata?.descriptionHTML || '').trim();
    const releaseNotes = (metadata?.releaseNotes || metadata?.recentChanges || '').trim();
    const rating = metadata?.score ?? metadata?.averageUserRating ?? 0;
    const ratingsCount = metadata?.ratings ?? metadata?.ratings_count ?? metadata?.userRatingCount ?? 0;
    const price = metadata?.priceText || (metadata?.price === 0 ? 'Free' : (metadata?.price ? `$${metadata.price}` : 'Free'));
    const contentRating = metadata?.contentRating || metadata?.trackContentRating || 'N/A';
    const version = metadata?.version || 'N/A';
    const updated = metadata?.updated || metadata?.updated_at || 'N/A';
    const keywordField = (metadata?.keywordField || metadata?.keywords || '').trim();

    prompt += `App Name / Title: ${title || 'None'} [Length: ${title.length}/30 characters]\n`;
    prompt += `Bundle ID / App ID: ${bundleId}\n`;
    prompt += `Developer / Seller: ${developer}\n`;
    prompt += `Primary Category: ${category}\n`;
    prompt += `Rating: ${rating}★ (${Number(ratingsCount).toLocaleString()} ratings)\n`;
    prompt += `Age / Content Rating: ${contentRating}\n`;
    prompt += `Price: ${price}\n`;
    prompt += `Version: ${version} (Updated/Released: ${updated})\n\n`;

    prompt += `[SUBTITLE - INDEXED FOR SEARCH, MAX 30 CHARS]\n`;
    prompt += `${subtitle ? `${subtitle} [Length: ${subtitle.length}/30 characters]` : 'None configured (30 characters available)'}\n\n`;

    prompt += `[PROMOTIONAL TEXT - UNINDEXED CONVERSION HOOK, MAX 170 CHARS]\n`;
    prompt += `${promoText ? `${promoText} [Length: ${promoText.length}/170 characters]` : 'None configured (170 characters available)'}\n\n`;

    if (keywordField) {
      prompt += `[KEYWORD FIELD - PRIVATE INDEXED FIELD, MAX 100 CHARS]\n`;
      prompt += `${keywordField} [Length: ${keywordField.length}/100 characters]\n\n`;
    }

    const hasBullets = desc.includes('•') || desc.includes('- ') || desc.includes('* ') || desc.includes('✔');
    prompt += `[FULL DESCRIPTION - CRO & CONVERSION ONLY, NOT INDEXED IN SEARCH, MAX 4,000 CHARS]\n`;
    prompt += `Length: ${desc.length}/4000 characters | Bullet Points Detected: ${hasBullets ? 'Yes' : 'No'}\n`;
    prompt += `${desc || 'None'}\n\n`;

    if (releaseNotes) {
      prompt += `[WHAT'S NEW / RELEASE NOTES]\n`;
      prompt += `${releaseNotes}\n\n`;
    }

    if (screenshotsCount > 0) {
      prompt += `[CREATIVE & VISUAL ASSETS]\n`;
      prompt += `Screenshots: ${screenshotsCount} uploaded (${screenshotsCount}/10 slots used - First 3 show in search results)\n`;
    }

  } else {
    // Google Play
    const title = (metadata?.title || packageName || '').trim();
    const appId = metadata?.appId || metadata?.package_name || packageName || 'N/A';
    const developer = metadata?.developer || 'N/A';
    const category = metadata?.category || metadata?.genre || 'N/A';
    const shortDesc = (metadata?.summary || metadata?.short_desc || '').trim();
    const desc = (metadata?.description || metadata?.descriptionHTML || '').trim();
    const recentChanges = (metadata?.recentChanges || metadata?.releaseNotes || '').trim();
    const rating = metadata?.score ?? 0;
    const ratingsCount = metadata?.ratings ?? metadata?.ratings_count ?? 0;
    const reviewsCount = metadata?.reviews ?? 0;
    const installs = metadata?.installs || (metadata?.minInstalls ? `${Number(metadata.minInstalls).toLocaleString()}+` : (metadata?.installs_exact ? `${Number(metadata.installs_exact).toLocaleString()}+` : 'N/A'));
    const price = metadata?.priceText || (metadata?.free ? 'Free' : (metadata?.price ? `$${metadata.price}` : 'Free'));
    const contentRating = metadata?.contentRating || 'N/A';
    const version = metadata?.version || 'N/A';
    const updated = metadata?.updated || metadata?.updated_at || 'N/A';
    const headerImage = metadata?.headerImage ? 'Present (1024x500 Feature Graphic)' : 'Missing/Not found';
    const privacyPolicy = metadata?.privacyPolicy || 'N/A';

    prompt += `App Title: ${title || 'None'} [Length: ${title.length}/30 characters]\n`;
    prompt += `Package Name: ${appId}\n`;
    prompt += `Developer: ${developer}\n`;
    prompt += `Category / Genre: ${category}\n`;
    prompt += `Installs Tier (Social Proof): ${installs}\n`;
    prompt += `Rating: ${rating}★ (${Number(ratingsCount).toLocaleString()} ratings, ${Number(reviewsCount).toLocaleString()} written reviews)\n`;
    prompt += `Content Rating: ${contentRating}\n`;
    prompt += `Price: ${price}\n`;
    prompt += `Version: ${version} (Updated: ${updated})\n`;
    prompt += `Privacy Policy: ${privacyPolicy}\n\n`;

    prompt += `[SHORT DESCRIPTION - HEAVILY INDEXED & ABOVE-THE-FOLD HOOK, MAX 80 CHARS]\n`;
    prompt += `${shortDesc ? `${shortDesc} [Length: ${shortDesc.length}/80 characters]` : 'None configured (80 characters available)'}\n\n`;

    const hasBullets = desc.includes('•') || desc.includes('- ') || desc.includes('* ') || desc.includes('<ul') || desc.includes('✔');
    prompt += `[FULL DESCRIPTION - HEAVILY INDEXED BY GOOGLE NLP, MAX 4,000 CHARS]\n`;
    prompt += `Length: ${desc.length}/4000 characters | Bullet Points Detected: ${hasBullets ? 'Yes' : 'No'}\n`;
    prompt += `${desc || 'None'}\n\n`;

    if (recentChanges) {
      prompt += `[WHAT'S NEW / RECENT CHANGES]\n`;
      prompt += `${recentChanges}\n\n`;
    }

    if (screenshotsCount > 0 || headerImage.startsWith('Present')) {
      prompt += `[CREATIVE & VISUAL ASSETS]\n`;
      if (headerImage.startsWith('Present')) {
        prompt += `Feature Graphic / Header Image: ${headerImage}\n`;
      }
      if (screenshotsCount > 0) {
        prompt += `Screenshots: ${screenshotsCount} uploaded (${screenshotsCount}/8 recommended slots used)\n`;
      }
    }
  }

  if (liveTelemetry) {
    prompt += `\n=== LIVE PERFORMANCE TELEMETRY ===\n`;
    prompt += `Daily User Installs: ${liveTelemetry.installs ?? 0}\n`;
    prompt += `Daily User Uninstalls: ${liveTelemetry.uninstalls ?? 0}\n`;
    prompt += `Active Devices: ${liveTelemetry.activeDevices ?? 0}\n`;
    prompt += `App Health Score: ${liveTelemetry.healthScore ?? 'N/A'}/100\n`;
  }

  prompt += `\n=== STRICT SCORING & ANTI-INFLATION INSTRUCTION ===\n`;
  prompt += `Score the listing objectively on a strict 0-100 scale using the 5-pillar rubric:\n`;
  prompt += `1. Title Optimization (0-25 pts)\n`;
  prompt += `2. Subtitle / Short Description (0-25 pts)\n`;
  prompt += `3. Full Description & Content Structure (0-20 pts)\n`;
  prompt += `4. Creative Assets & Merchandising (0-15 pts - skip visual penalties if asset metrics are not verified)\n`;
  prompt += `5. Ratings & Social Proof (0-15 pts)\n\n`;
  prompt += `ANTI-INFLATION DIRECTIVE:\n`;
  prompt += `- DO NOT assign scores in the 90s (e.g. 95-98) by default! Median apps score 60-75. A score > 88 requires flawless keyword synergy and zero wasted characters.\n`;
  prompt += `- Every flaw you identify MUST deduct corresponding points. If you output high-impact improvements, the total score MUST reflect these penalties.\n`;

  return prompt;
}

const auditPrompt = {
  system: UNIFIED_AUDIT_SYSTEM_PROMPT,
  getSystemPrompt: getAuditSystemPrompt,
  buildUserPrompt: buildAuditUserPrompt,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['score', 'headline', 'improvements'],
    properties: {
      score: { type: 'integer' },
      headline: { type: 'string' },
      improvements: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'impact', 'issue', 'recommendation'],
          properties: {
            type: {
              type: 'string',
              enum: [
                'title',
                'short_description',
                'subtitle',
                'keyword_field',
                'promotional_text',
                'description',
                'screenshots',
                'ratings',
                'whats_new',
                'category',
                'redundancy',
                'conversion',
                'visuals',
                'pricing'
              ]
            },
            impact: { type: 'string', enum: ['high', 'medium', 'low'] },
            issue: { type: 'string' },
            recommendation: { type: 'string' }
          }
        }
      }
    }
  }
};

const variantsPrompt = {
  system: `You are an expert ASO copywriter. Generate concise metadata candidate variants targeting the requested keyword cluster.
STRICT RULE: Respect hard character limits!
- Play Title <= 30 chars
- Play Short Description <= 80 chars
- Apple Subtitle <= 30 chars
- Apple Keyword field <= 100 chars (comma-separated, NO duplicated words from title)
Return structured JSON with candidate details.`,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['candidates'],
    properties: {
      candidates: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['field', 'text', 'charCount', 'targetTerms', 'rationale'],
          properties: {
            field: { type: 'string', enum: ['title', 'short_description', 'subtitle', 'keyword_field', 'promotional_text'] },
            text: { type: 'string' },
            charCount: { type: 'integer' },
            targetTerms: { type: 'array', items: { type: 'string' } },
            rationale: { type: 'string' }
          }
        }
      }
    }
  }
};

const gapsPrompt = {
  system: `Analyze app listings against competitors to find keyword coverage gaps and value proposition differences. Ground all claims in the provided text.`,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['gaps', 'competitorHooks'],
    properties: {
      gaps: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['term', 'targetedByCompetitors', 'opportunity'],
          properties: {
            term: { type: 'string' },
            targetedByCompetitors: { type: 'array', items: { type: 'string' } },
            opportunity: { type: 'string' }
          }
        }
      },
      competitorHooks: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['competitorKey', 'primaryHook'],
          properties: {
            competitorKey: { type: 'string' },
            primaryHook: { type: 'string' }
          }
        }
      }
    }
  }
};

const reviewsPrompt = {
  system: `Analyze app customer reviews to group them into key feedback themes and draft helpful, polite customer responses. Never auto-post.`,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['themes'],
    properties: {
      themes: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['themeName', 'sentiment', 'count', 'sampleQuote', 'insight'],
          properties: {
            themeName: { type: 'string' },
            sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral', 'feature_request'] },
            count: { type: 'integer' },
            sampleQuote: { type: 'string' },
            insight: { type: 'string' }
          }
        }
      }
    }
  }
};

/**
 * Calibrate AI/engine audit score against documented improvement severities.
 * Prevents grade inflation and inconsistency where listings with high-impact flaws
 * are incorrectly awarded inflated scores (e.g. 98/100).
 */
function calibrateAuditScore(auditData) {
  if (!auditData || typeof auditData !== 'object') return auditData;
  let score = typeof auditData.score === 'number' ? Math.round(auditData.score) : 70;
  const improvements = Array.isArray(auditData.improvements) ? auditData.improvements : [];

  const highCount = improvements.filter(i => String(i.impact || '').toLowerCase() === 'high').length;
  const medCount = improvements.filter(i => String(i.impact || '').toLowerCase() === 'medium').length;

  // Anti-grade inflation ceilings based on documented flaws:
  // 3+ high-impact issues -> maximum score is 68
  // 2 high-impact issues -> maximum score is 76
  // 1 high-impact issue -> maximum score is 84
  // 2+ medium-impact issues -> maximum score is 88
  if (highCount >= 3) {
    score = Math.min(score, 68);
  } else if (highCount === 2) {
    score = Math.min(score, 76);
  } else if (highCount === 1) {
    score = Math.min(score, 84);
  } else if (medCount >= 2) {
    score = Math.min(score, 88);
  }

  // Never allow 96-100 if there are multiple documented improvements
  if (improvements.length >= 2) {
    score = Math.min(score, 90);
  } else if (improvements.length === 1) {
    score = Math.min(score, 94);
  }

  score = Math.max(15, Math.min(99, score));
  auditData.score = score;
  return auditData;
}

module.exports = {
  auditPrompt,
  getAuditSystemPrompt,
  buildAuditUserPrompt,
  calibrateAuditScore,
  variantsPrompt,
  gapsPrompt,
  reviewsPrompt
};
