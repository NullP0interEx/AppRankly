const { getBaseConfig } = require('../config');
const { fetchPackagesByPlatform } = require('../viewerFactory');
const dbModule = require('../db');
const scraper = require('./scraper');
const mainScraper = require('../scraper');
const { getAIStatus, generateJSON } = require('../ai');
const prompts = require('../ai/prompts');
const crypto = require('crypto');
const { withTimeout } = require('../utils/timeout');

let activeJob = {
  id: null,
  status: 'idle', // 'idle' | 'running' | 'completed' | 'cancelled' | 'failed'
  phase: '',
  progress: 0,
  currentApp: null,
  total: 0,
  processed: 0,
  results: [],
  avgScore: null,
  error: null,
  startedAt: null,
  completedAt: null
};

let cancelRequested = false;

function isApplePlatform(platform) {
  if (!platform) return false;
  const p = String(platform).toLowerCase();
  return p === 'apple' || p === 'ios';
}

function calculateDeterministicAsoAudit(pkg, metadata, platform) {
  const normPlat = isApplePlatform(platform) ? 'apple' : 'play';
  const title = (metadata?.title || pkg?.name || '').trim();
  const shortDesc = (metadata?.short_desc || metadata?.summary || metadata?.subtitle || '').trim();
  const desc = (metadata?.description || metadata?.descriptionHTML || '').trim();
  const rating = Number(metadata?.score || metadata?.averageUserRating || 0);
  const ratingsCount = Number(metadata?.ratings_count || metadata?.ratings || metadata?.reviews || metadata?.userRatingCount || 0);

  const improvements = [];

  // 1. Title Audit (25 points max)
  let titleScore = 0;
  const titleLen = title.length;
  if (titleLen >= 25 && titleLen <= 30) {
    titleScore += 15;
  } else if (titleLen >= 20 && titleLen < 25) {
    titleScore += 11;
  } else if (titleLen >= 12 && titleLen < 20) {
    titleScore += 7;
  } else if (titleLen > 30) {
    titleScore += 3;
    improvements.push({
      type: "title",
      impact: "high",
      issue: `Title exceeds 30-character store limit (${titleLen}/30 chars)`,
      recommendation: `Trim app title from ${titleLen} to under 30 characters to avoid store truncation and penalty.`
    });
  } else {
    titleScore += 3;
  }

  if (titleLen <= 22 && titleLen <= 30) {
    improvements.push({
      type: "title",
      impact: "high",
      issue: `Underutilized title keyword space (${titleLen}/30 chars)`,
      recommendation: `Expand title from ${titleLen} to 25-30 characters with high-volume search queries separated by colon or dash.`
    });
  }

  const hasSeparator = title.includes(':') || title.includes('-') || title.includes('|');
  if (hasSeparator) {
    titleScore += 10;
  } else if (titleLen >= 24) {
    titleScore += 6;
  } else {
    titleScore += 2;
    if (!improvements.some(i => i.type === 'title')) {
      improvements.push({
        type: "title",
        impact: "medium",
        issue: "Missing category keyword separator",
        recommendation: "Structure title as 'Brand: Primary Keyword & Feature' to maximize keyword search discovery."
      });
    }
  }

  // 2. Subtitle / Short Description Audit (25 points max)
  let subScore = 0;
  const subLen = shortDesc.length;
  if (normPlat === 'play') {
    if (subLen >= 65 && subLen <= 80) {
      subScore = 25;
    } else if (subLen >= 50 && subLen < 65) {
      subScore = 18;
    } else if (subLen >= 30 && subLen < 50) {
      subScore = 12;
    } else if (subLen > 80) {
      subScore = 4;
      improvements.push({
        type: "short_description",
        impact: "high",
        issue: `Short description exceeds 80 characters (${subLen}/80 chars)`,
        recommendation: "Shorten short description to under 80 characters to comply with Google Play listing rules."
      });
    } else if (subLen > 0) {
      subScore = 6;
    } else {
      subScore = 0;
      improvements.push({
        type: "short_description",
        impact: "high",
        issue: "Missing short description",
        recommendation: "Add an 80-character short description combining secondary keywords with a strong user action hook."
      });
    }

    if (subLen > 0 && subLen < 55) {
      improvements.push({
        type: "short_description",
        impact: "high",
        issue: `Short description underutilized (${subLen}/80 chars)`,
        recommendation: "Expand short description towards the 80-character limit with clear value propositions and action verbs."
      });
    }
  } else {
    // Apple Subtitle (max 30 chars)
    if (subLen >= 25 && subLen <= 30) {
      subScore = 22;
    } else if (subLen >= 18 && subLen < 25) {
      subScore = 16;
    } else if (subLen >= 10 && subLen < 18) {
      subScore = 9;
    } else if (subLen > 30) {
      subScore = 3;
      improvements.push({
        type: "subtitle",
        impact: "high",
        issue: `Subtitle exceeds 30 characters (${subLen}/30 chars)`,
        recommendation: "Trim subtitle to under 30 characters to comply with Apple App Store limits."
      });
    } else if (subLen > 0) {
      subScore = 5;
    } else {
      subScore = 0;
      improvements.push({
        type: "subtitle",
        impact: "high",
        issue: "Missing Apple subtitle",
        recommendation: "Configure a 30-character subtitle in App Store Connect with high-intent search keywords."
      });
    }

    // Check for redundant words between title and subtitle
    const titleWords = new Set(title.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length >= 3));
    const subWords = shortDesc.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length >= 3);
    const duplicates = [...new Set(subWords.filter(w => titleWords.has(w)))];

    if (duplicates.length > 0) {
      subScore = Math.max(0, subScore - 8);
      improvements.push({
        type: "redundancy",
        impact: "high",
        issue: `Redundant keywords in subtitle: "${duplicates.join(', ')}"`,
        recommendation: "Remove duplicate words already in your App Name. Apple indexes words across both fields; replace with fresh search terms."
      });
    } else if (subLen >= 22) {
      subScore = Math.min(25, subScore + 3);
    }

    if (subLen > 0 && subLen < 20 && !duplicates.length) {
      improvements.push({
        type: "subtitle",
        impact: "high",
        issue: `Subtitle underutilized (${subLen}/30 chars)`,
        recommendation: "Utilize all 25-30 characters in Apple subtitle with secondary high-intent search queries."
      });
    }
  }

  // 3. Full Description Audit (20 points max)
  let descScore = 0;
  const descLen = desc.length;
  if (descLen >= 1500) {
    descScore += 10;
  } else if (descLen >= 800) {
    descScore += 7;
  } else if (descLen >= 400) {
    descScore += 4;
  } else {
    descScore += 1;
    improvements.push({
      type: "description",
      impact: "medium",
      issue: `Thin store description (${descLen} characters)`,
      recommendation: "Expand full description with detailed feature highlights, user benefits, and frequent update notes."
    });
  }

  const hasBullets = desc.includes('•') || desc.includes('- ') || desc.includes('* ') || desc.includes('<ul') || desc.includes('✔');
  if (hasBullets) {
    descScore += 6;
  } else {
    improvements.push({
      type: "description",
      impact: "medium",
      issue: "Missing scannable bullet points",
      recommendation: "Format top 5 feature benefits as clean bullet points to increase reader scan rate and conversion."
    });
  }

  const hasCtaOrProof = /download|start|try|contact|join|features|support|free|premium/i.test(desc);
  if (hasCtaOrProof) {
    descScore += 4;
  } else {
    descScore += 1;
  }

  // 4. Visual Assets & Merchandising (15 points max)
  let visualScore = 0;
  let screenshotsCount = 0;
  if (Array.isArray(metadata?.screenshots)) {
    screenshotsCount = metadata.screenshots.length;
  } else if (typeof metadata?.screenshots_json === 'string') {
    try {
      const parsed = JSON.parse(metadata.screenshots_json);
      if (Array.isArray(parsed)) screenshotsCount = parsed.length;
    } catch (_) {}
  }

  if (screenshotsCount >= 6) {
    visualScore += 10;
  } else if (screenshotsCount >= 4) {
    visualScore += 7;
  } else if (screenshotsCount >= 2) {
    visualScore += 4;
    improvements.push({
      type: "screenshots",
      impact: "high",
      issue: `Low screenshot count (${screenshotsCount} uploaded)`,
      recommendation: "Upload at least 5-8 benefit-driven screenshots with high-contrast text captions."
    });
  } else if (screenshotsCount === 1) {
    visualScore += 2;
    improvements.push({
      type: "screenshots",
      impact: "high",
      issue: "Only 1 screenshot detected",
      recommendation: "Upload 5+ screenshots showcasing your app workflow to improve store conversion."
    });
  } else {
    // Unverified / not scraped via API: do not penalize listing
    visualScore += 10;
  }

  if (normPlat === 'play') {
    if (metadata?.headerImage) {
      visualScore += 5;
    } else if (screenshotsCount > 0) {
      visualScore += 1;
      improvements.push({
        type: "visuals",
        impact: "medium",
        issue: "Missing 1024x500 Feature Graphic",
        recommendation: "Add a 1024x500 Feature Graphic to qualify for Google Play merchandising and promo spots."
      });
    } else {
      // Unverified: do not penalize
      visualScore += 5;
    }
  } else {
    if (screenshotsCount >= 3) {
      visualScore += 5;
    } else if (screenshotsCount > 0) {
      visualScore += 2;
    } else {
      // Unverified: do not penalize
      visualScore += 5;
    }
  }

  // 5. Rating & Social Proof (15 points max)
  let ratingScore = 0;
  if (rating >= 4.6) {
    ratingScore += 10;
  } else if (rating >= 4.3) {
    ratingScore += 8;
  } else if (rating >= 4.0) {
    ratingScore += 6;
  } else if (rating >= 3.5) {
    ratingScore += 3;
    improvements.push({
      type: "ratings",
      impact: "high",
      issue: `Sub-optimal rating (${rating.toFixed(1)}★)`,
      recommendation: "Analyze negative review trends and address crash or UX friction points to restore rating."
    });
  } else if (rating > 0) {
    ratingScore += 1;
    improvements.push({
      type: "ratings",
      impact: "high",
      issue: `Low star rating (${rating.toFixed(1)}★)`,
      recommendation: "Resolve critical bugs mentioned in negative reviews and engage dissatisfied users."
    });
  } else {
    ratingScore += 5; // new app baseline
  }

  if (ratingsCount >= 500) {
    ratingScore += 5;
  } else if (ratingsCount >= 50) {
    ratingScore += 4;
  } else if (ratingsCount >= 10) {
    ratingScore += 2;
  } else if (ratingsCount > 0) {
    ratingScore += 1;
    improvements.push({
      type: "ratings",
      impact: "medium",
      issue: `Low rating volume (${ratingsCount} ratings)`,
      recommendation: "Prompt satisfied users with in-app review dialog after milestone achievements."
    });
  } else {
    ratingScore += 1;
  }

  const rawScore = titleScore + subScore + descScore + visualScore + ratingScore;

  // Sort improvements by impact: high first, then medium, then low
  const impactOrder = { high: 0, medium: 1, low: 2 };
  improvements.sort((a, b) => (impactOrder[a.impact] ?? 1) - (impactOrder[b.impact] ?? 1));

  // De-duplicate improvements by issue/type
  const seenTypes = new Set();
  const dedupedImprovements = [];
  for (const imp of improvements) {
    if (!seenTypes.has(imp.type)) {
      seenTypes.add(imp.type);
      dedupedImprovements.push(imp);
    }
  }

  const rankedImprovements = dedupedImprovements.slice(0, 3);
  if (rankedImprovements.length === 0) {
    rankedImprovements.push({
      type: "category",
      impact: "medium",
      issue: "Global Store Localization",
      recommendation: "Translate metadata into top international store territories (ES, DE, FR, JA) to capture organic growth."
    });
  }

  const result = {
    score: rawScore,
    headline: '',
    improvements: rankedImprovements
  };

  if (prompts && typeof prompts.calibrateAuditScore === 'function') {
    prompts.calibrateAuditScore(result);
  } else {
    result.score = Math.max(15, Math.min(99, Math.round(result.score)));
  }

  // Determine dynamic headline based on calibrated score
  if (result.score >= 90) {
    result.headline = "Exceptional metadata alignment and high keyword placement efficiency. Ready for store promotion.";
  } else if (result.score >= 80) {
    result.headline = "Strong metadata foundation; targeted keyword refinement and conversion polish will unlock additional search traffic.";
  } else if (result.score >= 70) {
    result.headline = "Solid baseline; title keyword budget and short description value propositions should be enriched.";
  } else if (result.score >= 55) {
    result.headline = "Sub-optimal ASO health; notable keyword gaps and character underutilization are dampening search visibility.";
  } else {
    result.headline = "Critical ASO deficiencies detected; unindexed character slots and weak formatting significantly limit organic discovery.";
  }

  return result;
}

/**
 * Ensure listing snapshot exists in DB and cache
 */
async function ensureAppSnapshot(packageName, platform, { force = false, timeoutMs = 8000 } = {}) {
  const liveDb = dbModule.db;
  const normPlat = isApplePlatform(platform) ? 'apple' : 'play';

  if (!force && liveDb) {
    try {
      const snap = liveDb.prepare(`
        SELECT * FROM aso_listing_snapshot
        WHERE package_name = ? AND platform = ?
        ORDER BY fetched_at DESC LIMIT 1
      `).get(packageName, platform);
      if (snap && (snap.title || snap.description)) return snap;
    } catch (e) {}
  }

  let data = null;
  try {
    if (normPlat === 'play') {
      data = await withTimeout(
        scraper.getPlayListing(packageName, { force }),
        timeoutMs,
        `Google Play fetch timed out for ${packageName}`
      );
    } else {
      data = await withTimeout(
        scraper.getAppleLookup(packageName, { force }),
        timeoutMs,
        `Apple App Store fetch timed out for ${packageName}`
      );
    }
  } catch (e) {
    console.warn(`[PortfolioJob] Scraper error for ${packageName}:`, e.message);
  }

  if (!data) {
    // Check cached store data fallback
    const cached = mainScraper.getCachedStoreData(packageName, normPlat);
    if (cached) {
      try {
        data = normPlat === 'play'
          ? await scraper.getPlayListing(packageName, { force: false })
          : await scraper.getAppleLookup(packageName, { force: false });
      } catch (_) {}
    }
  }

  if (liveDb && data && (data.title || data.trackName)) {
    try {
      liveDb.prepare(`
        INSERT INTO aso_listing_snapshot (
          package_name, platform, store, title, short_desc, subtitle, description,
          developer, category, icon_url, screenshots_json, score, ratings_count, installs_exact, price, content_rating, updated_at, fetched_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(package_name, platform, store, fetched_at) DO UPDATE SET
          title = excluded.title, short_desc = excluded.short_desc, subtitle = excluded.subtitle,
          description = excluded.description, developer = excluded.developer, category = excluded.category,
          icon_url = excluded.icon_url, score = excluded.score, ratings_count = excluded.ratings_count
      `).run(
        packageName, platform, normPlat,
        data.title || data.trackName || '',
        data.summary || data.short_desc || '',
        data.subtitle || '',
        data.description || data.descriptionHTML || '',
        data.developer || '',
        data.category || '',
        data.icon || data.iconUrl || '',
        JSON.stringify(data.screenshots || []),
        data.score || 0,
        data.ratings || 0,
        data.minInstalls || 0,
        data.priceText || '',
        data.contentRating || '',
        data.updated || ''
      );

      return liveDb.prepare(`
        SELECT * FROM aso_listing_snapshot
        WHERE package_name = ? AND platform = ?
        ORDER BY fetched_at DESC LIMIT 1
      `).get(packageName, platform);
    } catch (err) {
      console.warn(`[PortfolioJob] Error persisting snapshot for ${packageName}:`, err.message);
    }
  }

  return (data && (data.title || data.trackName)) ? data : null;
}

/**
 * Main execution loop for the portfolio ASO job
 */
async function executePortfolioJob(jobId, platformScope = 'all', options = {}) {
  const force = Boolean(typeof options === 'object' ? options.force : options);
  const refreshOnly = Boolean(options?.refreshOnly);
  const runAi = Boolean(options?.runAi ?? !refreshOnly);
  const customProvider = options?.provider;
  const customModel = options?.model;

  const baseConfig = getBaseConfig();
  if (!baseConfig) {
    activeJob.status = 'failed';
    activeJob.error = 'Base configuration unavailable';
    return;
  }

  let packages = [];
  try {
    packages = await fetchPackagesByPlatform(platformScope === 'all' ? 'all' : platformScope, baseConfig);
  } catch (err) {
    activeJob.status = 'failed';
    activeJob.error = `Failed to list packages: ${err.message}`;
    return;
  }

  if (packages.length === 0) {
    activeJob.status = 'completed';
    activeJob.total = 0;
    activeJob.processed = 0;
    activeJob.completedAt = new Date().toISOString();
    return;
  }

  activeJob.total = packages.length;
  activeJob.processed = 0;
  activeJob.results = [];
  activeJob.jobType = refreshOnly ? 'refresh' : 'ai';
  const liveDb = dbModule.db;

  const aiStatus = getAIStatus();
  const hasAiAvailable = aiStatus.providers?.some(p => p.available);
  const preferredProvider = customProvider || aiStatus.defaultProvider || 'anthropic';

  for (let i = 0; i < packages.length; i++) {
    if (cancelRequested) {
      activeJob.status = 'cancelled';
      activeJob.phase = 'Job cancelled by user';
      activeJob.completedAt = new Date().toISOString();
      return;
    }

    const pkg = packages[i];
    const pkgName = pkg.packageName || pkg.bundleId || pkg.appId;
    const displayName = baseConfig.appMetadata?.[pkgName]?.displayName || pkg.name || pkgName;
    const pkgPlatform = pkg.platform || 'google';

    activeJob.currentApp = displayName;
    activeJob.progress = Math.round(((i) / packages.length) * 100);

    try {
      // Step 1: Ensure/Repull store metadata & update cache with timeout
      activeJob.phase = `Refreshing store metadata (${i + 1}/${packages.length}): ${displayName}`;
      const snapshot = await withTimeout(
        ensureAppSnapshot(pkgName, pkgPlatform, { force: force || refreshOnly, timeoutMs: 8000 }),
        10000,
        `Metadata fetch timed out after 10s for ${pkgName}`
      );

      // Check if store metadata exists (skip dormant / non-public apps)
      const hasMetadata = Boolean(snapshot && (snapshot.title || snapshot.trackName));
      if (!hasMetadata) {
        console.warn(`[PortfolioJob] No store metadata found for ${pkgName} (dormant or non-public app). Skipping to next app.`);
        activeJob.results.push({
          packageName: pkgName,
          platform: pkgPlatform,
          name: displayName,
          iconUrl: pkg.iconUrl || '',
          score: null,
          headline: 'Dormant or non-public app (no store metadata available)',
          improvements: [],
          topFix: null,
          isDormant: true,
          updatedAt: new Date().toISOString()
        });
        activeJob.processed = i + 1;
        activeJob.progress = Math.round(((i + 1) / packages.length) * 100);
        continue;
      }

      let auditResult = null;

      // Step 2: Run AI / ASO Analytics if enabled
      if (runAi) {
        activeJob.phase = `Running AI analytics (${i + 1}/${packages.length}): ${displayName}`;

        // Try AI audit if provider is ready and enabled, otherwise use deterministic engine
        if (hasAiAvailable) {
          try {
            const promptText = prompts.auditPrompt.buildUserPrompt({
              platform: pkgPlatform,
              metadata: snapshot,
              packageName: pkgName,
              focusArea: 'Comprehensive store listing audit, character limit efficiency & keyword discovery'
            });

            const aiRes = await withTimeout(
              generateJSON({
                system: prompts.auditPrompt.getSystemPrompt(pkgPlatform),
                prompt: promptText,
                schema: prompts.auditPrompt.schema,
                provider: preferredProvider,
                customModel
              }),
              15000,
              `AI audit timed out after 15s for ${pkgName}`
            );

            if (aiRes?.data && aiRes.data.score) {
              if (prompts && typeof prompts.calibrateAuditScore === 'function') {
                prompts.calibrateAuditScore(aiRes.data);
              }
              auditResult = {
                score: aiRes.data.score,
                headline: aiRes.data.headline,
                improvements: aiRes.data.improvements || []
              };

              if (liveDb) {
                const inputHash = crypto.createHash('md5').update(promptText).digest('hex');
                liveDb.prepare(`
                  INSERT INTO aso_ai_run (package_name, platform, kind, provider, model, input_hash, prompt_version, input_tokens, output_tokens, est_cost_usd, payload)
                  VALUES (?, ?, 'audit', ?, ?, ?, 1, ?, ?, 0, ?)
                `).run(pkgName, pkgPlatform, aiRes.provider, aiRes.model, inputHash, aiRes.usage?.inputTokens || 0, aiRes.usage?.outputTokens || 0, JSON.stringify(aiRes.data));
              }
            }
          } catch (e) {
            console.warn(`[PortfolioJob] AI audit failed for ${pkgName}, falling back to deterministic:`, e.message);
          }
        }

        if (!auditResult) {
          auditResult = calculateDeterministicAsoAudit(pkg, snapshot, pkgPlatform);

          if (liveDb) {
            liveDb.prepare(`
              INSERT INTO aso_ai_run (package_name, platform, kind, provider, model, input_hash, prompt_version, input_tokens, output_tokens, est_cost_usd, payload)
              VALUES (?, ?, 'audit', 'rule-engine', 'v2-rules', ?, 1, 0, 0, 0, ?)
            `).run(pkgName, pkgPlatform, `${pkgName}_${Date.now()}`, JSON.stringify(auditResult));
          }
        }
      }

      activeJob.results.push({
        packageName: pkgName,
        platform: pkgPlatform,
        name: displayName,
        iconUrl: snapshot?.icon_url || pkg.iconUrl || '',
        score: auditResult ? auditResult.score : (snapshot?.score ? Math.round(snapshot.score * 20) : null),
        headline: auditResult?.headline || (refreshOnly ? 'Store metadata refreshed.' : null),
        improvements: auditResult?.improvements || [],
        topFix: auditResult?.improvements?.[0] || null,
        updatedAt: new Date().toISOString()
      });

    } catch (err) {
      console.warn(`[PortfolioJob] Error or timeout processing app ${pkgName} (${err.message}). Skipping to next app.`);
      activeJob.results.push({
        packageName: pkgName,
        platform: pkgPlatform,
        name: displayName,
        iconUrl: pkg.iconUrl || '',
        score: null,
        error: err.message,
        headline: `Skipped (${err.message.includes('timed out') ? 'Timed out' : 'Fetch failed'})`,
        improvements: [],
        topFix: null,
        isDormant: true,
        updatedAt: new Date().toISOString()
      });
    }

    activeJob.processed = i + 1;
    activeJob.progress = Math.round(((i + 1) / packages.length) * 100);
  }

  // Calculate average score
  const validScores = activeJob.results.filter(r => r.score != null).map(r => r.score);
  activeJob.avgScore = validScores.length > 0
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : null;

  activeJob.status = 'completed';
  activeJob.phase = `Completed ASO analytics across ${packages.length} apps`;
  activeJob.completedAt = new Date().toISOString();
  activeJob.currentApp = null;
}

function startPortfolioJob(platform = 'all', options = {}) {
  const opts = typeof options === 'boolean' ? { force: options } : (options || {});
  if (activeJob.status === 'running') {
    return {
      started: false,
      job: activeJob,
      message: 'Portfolio ASO job is already running'
    };
  }

  cancelRequested = false;
  const jobId = `job_aso_${Date.now()}`;
  activeJob = {
    id: jobId,
    status: 'running',
    phase: opts.refreshOnly ? 'Initializing portfolio store metadata refresh...' : 'Initializing portfolio AI analytics...',
    jobType: opts.refreshOnly ? 'refresh' : 'ai',
    progress: 0,
    currentApp: null,
    total: 0,
    processed: 0,
    results: [],
    avgScore: null,
    error: null,
    startedAt: new Date().toISOString(),
    completedAt: null
  };

  // Launch job asynchronously
  setImmediate(() => {
    executePortfolioJob(jobId, platform, opts).catch(err => {
      console.error('[PortfolioJob] Fatal job execution error:', err);
      activeJob.status = 'failed';
      activeJob.error = err.message;
      activeJob.completedAt = new Date().toISOString();
    });
  });

  return {
    started: true,
    job: activeJob
  };
}

function cancelPortfolioJob() {
  if (activeJob.status === 'running') {
    cancelRequested = true;
    activeJob.phase = 'Cancelling...';
    return { success: true, message: 'Cancellation requested' };
  }
  return { success: false, message: 'No job currently running' };
}

function getPortfolioJobStatus() {
  return activeJob;
}

module.exports = {
  startPortfolioJob,
  cancelPortfolioJob,
  getPortfolioJobStatus,
  ensureAppSnapshot,
  calculateDeterministicAsoAudit
};
