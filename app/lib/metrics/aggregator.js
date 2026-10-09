const { zScoreAnomalies } = require('./statistics');

/**
 * Aggregates a list of overviews into a single overview.
 * @param {Array<Object>} overviewsWithNames
 * @returns {Object|null}
 */
function aggregateOverviews(overviewsWithNames) {
  const validOverviews = (overviewsWithNames || []).filter(item => {
    if (item && item.overview) return true;
    if (item && item.totalInstallCountByUser !== undefined) return true;
    return false;
  });

  if (validOverviews.length === 0) return null;

  const appTrendsMap = {};
  const platformTotals = {};
  
  const aggregated = validOverviews.reduce((acc, item) => {
    const isGenerateDataFormat = !!item.overview;
    const curr = isGenerateDataFormat ? item.overview : item;
    
    const plat = curr.platform || item.platform || 'unknown';
    const key = item.packageName || item.name;

    if (key && curr.dailyTrends) {
      const trendEntry = {
        name: item.name || item.displayName || key,
        packageName: item.packageName || key,
        platform: plat,
        dailyTrends: curr.dailyTrends,
        trends: curr.dailyTrends
      };

      appTrendsMap[`${plat}:${key}`] = trendEntry;
      if (item.name && item.name !== key) {
        appTrendsMap[`${plat}:${item.name}`] = trendEntry;
      }
      if (item.displayName && item.displayName !== key && item.displayName !== item.name) {
        appTrendsMap[`${plat}:${item.displayName}`] = trendEntry;
      }
      if (item.bundleId && item.bundleId !== key) {
        appTrendsMap[`${plat}:${item.bundleId}`] = trendEntry;
      }

      if (!appTrendsMap[key]) {
        appTrendsMap[key] = trendEntry;
      } else if (appTrendsMap[key].platform !== plat) {
        delete appTrendsMap[key];
      }

      if (item.name && !appTrendsMap[item.name]) {
        appTrendsMap[item.name] = trendEntry;
      }
      if (item.displayName && !appTrendsMap[item.displayName]) {
        appTrendsMap[item.displayName] = trendEntry;
      }
      if (item.bundleId && !appTrendsMap[item.bundleId]) {
        appTrendsMap[item.bundleId] = trendEntry;
      }
    }

    if (!platformTotals[plat]) {
      platformTotals[plat] = { totalInstalls: 0, totalDailyUserInstalls: 0, totalDailyUserUninstalls: 0, currentlyActiveDevices: 0, appCount: 0 };
    }
    platformTotals[plat].totalInstalls += (curr.totalInstallCountByUser || curr.totalDailyUserInstalls || 0);
    platformTotals[plat].totalDailyUserInstalls += (curr.totalDailyUserInstalls || curr.totalInstallCountByUser || 0);
    platformTotals[plat].totalDailyUserUninstalls += (curr.totalDailyUserUninstalls || 0);
    platformTotals[plat].currentlyActiveDevices += (curr.currentlyActiveDevices || 0);
    platformTotals[plat].appCount += 1;

    acc.totalInstallCountByUser += (curr.totalInstallCountByUser || 0);
    acc.totalUninstallCountByUser += (curr.totalUninstallCountByUser || 0);
    acc.totalInstallEventsDetected += (curr.totalInstallEventsDetected || 0);
    acc.totalUninstallEventsDetected += (curr.totalUninstallEventsDetected || 0);
    acc.totalUpdateEventsDetected += (curr.totalUpdateEventsDetected || 0);
    acc.totalDeviceUpgrades += (curr.totalDeviceUpgrades || 0);
    acc.totalDailyDeviceInstalls += (curr.totalDailyDeviceInstalls || 0);
    acc.totalDailyUserInstalls += (curr.totalDailyUserInstalls || 0);
    acc.totalDailyUserUninstalls += (curr.totalDailyUserUninstalls || 0);
    acc.currentlyActiveDevices += (curr.currentlyActiveDevices || 0);

    if (curr.ratingsDistribution) {
      Object.keys(curr.ratingsDistribution).forEach(star => {
        acc.ratingsDistribution[star] = (acc.ratingsDistribution[star] || 0) + (curr.ratingsDistribution[star] || 0);
      });
    }

    (curr.dailyTrends || []).forEach(trend => {
      const existing = acc.dailyTrendsMap.get(trend.date);
      if (existing) {
        existing.activeDevices += (trend.activeDevices || 0);
        existing.dailyInstalls += (trend.dailyInstalls || 0);
        existing.dailyUninstalls += (trend.dailyUninstalls || 0);
        existing.upgrades += (trend.upgrades || 0);
        existing.dailyDeviceInstalls += (trend.dailyDeviceInstalls || 0);
        existing.dailyUserInstalls += (trend.dailyUserInstalls || 0);
        existing.dailyUserUninstalls += (trend.dailyUserUninstalls || 0);
        existing.netGrowth += (trend.netGrowth || 0);
        if (trend.crashRate !== undefined) {
          existing.crashRateCount = (existing.crashRateCount || 0) + 1;
          existing.crashRateSum = (existing.crashRateSum || 0) + trend.crashRate;
          existing.crashRate = existing.crashRateSum / existing.crashRateCount;
        }
        if (trend.anrRate !== undefined) {
          existing.anrRateCount = (existing.anrRateCount || 0) + 1;
          existing.anrRateSum = (existing.anrRateSum || 0) + trend.anrRate;
          existing.anrRate = existing.anrRateSum / existing.anrRateCount;
        }
      } else {
        const copy = { ...trend };
        if (trend.crashRate !== undefined) {
          copy.crashRateCount = 1;
          copy.crashRateSum = trend.crashRate;
        }
        if (trend.anrRate !== undefined) {
          copy.anrRateCount = 1;
          copy.anrRateSum = trend.anrRate;
        }
        acc.dailyTrendsMap.set(trend.date, copy);
      }
    });

    return acc;
  }, {
    totalInstallCountByUser: 0,
    totalUninstallCountByUser: 0,
    totalInstallEventsDetected: 0,
    totalUninstallEventsDetected: 0,
    totalUpdateEventsDetected: 0,
    totalDeviceUpgrades: 0,
    totalDailyDeviceInstalls: 0,
    totalDailyUserInstalls: 0,
    totalDailyUserUninstalls: 0,
    currentlyActiveDevices: 0,
    ratingsDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    dailyTrendsMap: new Map()
  });

  let totalWeightedRating = 0;
  let totalRatingsCount = 0;
  Object.keys(aggregated.ratingsDistribution).forEach(star => {
    const count = aggregated.ratingsDistribution[star];
    totalWeightedRating += parseInt(star) * count;
    totalRatingsCount += count;
  });

  aggregated.averageRating = totalRatingsCount > 0 ? parseFloat((totalWeightedRating / totalRatingsCount).toFixed(2)) : 0;
  
  aggregated.dailyTrends = Array.from(aggregated.dailyTrendsMap.values())
    .map(t => {
      const { crashRateCount, crashRateSum, anrRateCount, anrRateSum, ...rest } = t;
      return rest;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  delete aggregated.dailyTrendsMap;

  aggregated.appTrends = appTrendsMap;

  const hasUninstallData = validOverviews.some(item => {
    const curr = item.overview || item;
    return curr.hasUninstallData !== false && curr.platform !== 'apple' && curr.platform !== 'appstore';
  });
  aggregated.hasUninstallData = hasUninstallData;

  const platforms = new Set(validOverviews.map(item => (item.overview || item).platform).filter(Boolean));
  aggregated.platform = platforms.size === 1 ? Array.from(platforms)[0] : 'all';

  aggregated.platformTotals = platformTotals;

  return aggregated;
}

/**
 * Normalizes app name for matching across app stores.
 * @param {string} name
 * @returns {{cleanName: string, alphaNumeric: string, tokens: string[], rawTokens: string[]}}
 */
function getAppSignature(name = '') {
  const cleanName = String(name)
    .replace(/\s*\((app store|play store|android|ios)\)\s*/gi, '')
    .replace(/\s*\[(app store|play store|android|ios)\]\s*/gi, '')
    .trim();

  const alphaNumeric = cleanName.toLowerCase().replace(/[^a-z0-9]/gi, '');

  const rawTokens = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const stopWords = new Set(['app', 'store', 'play', 'the', 'a', 'an', 'and', 'for', 'mobile', 'ios', 'android', 'official']);
  const tokens = rawTokens.filter(t => !stopWords.has(t));

  return { cleanName, alphaNumeric, tokens, rawTokens };
}

/**
 * Evaluates whether two app identifiers belong to the same product across stores.
 * @param {string} [appleName]
 * @param {string} [googleName]
 * @param {string} [appleBundleId]
 * @param {string} [googlePackageName]
 * @returns {boolean}
 */
function isSimilarAppName(appleName = '', googleName = '', appleBundleId = '', googlePackageName = '') {
  if (appleBundleId && googlePackageName) {
    const aPkg = String(appleBundleId).toLowerCase().trim();
    const gPkg = String(googlePackageName).toLowerCase().trim();
    if (aPkg === gPkg) return true;
    const aLast = aPkg.split('.').pop();
    const gLast = gPkg.split('.').pop();
    if (aLast && gLast && aLast.length >= 4 && aLast === gLast) return true;
  }

  const sigA = getAppSignature(appleName);
  const sigG = getAppSignature(googleName);

  if (sigA.alphaNumeric.length >= 3 && sigA.alphaNumeric === sigG.alphaNumeric) {
    return true;
  }

  if (sigA.tokens.length > 0 && sigA.tokens.length === sigG.tokens.length) {
    const sortedA = [...sigA.tokens].sort().join(' ');
    const sortedG = [...sigG.tokens].sort().join(' ');
    if (sortedA === sortedG) return true;
  }

  const aSquished = sigA.rawTokens.join('');
  const gSquished = sigG.rawTokens.join('');

  if (sigA.tokens.length >= 1 && sigG.tokens.length >= 1) {
    const firstTwoA = sigA.tokens.slice(0, 2).join('');
    const firstTwoG = sigG.tokens.slice(0, 2).join('');

    const brandMatch =
      sigA.tokens[0] === sigG.tokens[0] ||
      (firstTwoA.length >= 4 && firstTwoA === firstTwoG) ||
      (firstTwoA.length >= 4 && (firstTwoA === sigG.tokens[0] || sigA.tokens[0] === firstTwoG)) ||
      (aSquished.length >= 6 && gSquished.length >= 6 && (aSquished.startsWith(gSquished.slice(0, 6)) || gSquished.startsWith(aSquished.slice(0, 6))));

    if (brandMatch) {
      const setA = new Set(sigA.tokens);
      const setG = new Set(sigG.tokens);
      let commonCount = 0;
      setA.forEach(t => { if (setG.has(t)) commonCount++; });
      if (commonCount >= 1 || sigA.tokens.length === 1 || sigG.tokens.length === 1) {
        return true;
      }
    }
  }

  if (sigA.tokens.length >= 2 && sigG.tokens.length >= 2) {
    const setA = new Set(sigA.tokens);
    const setG = new Set(sigG.tokens);
    let commonCount = 0;

    setA.forEach(t => {
      for (const gt of setG) {
        if (t === gt || (t.length >= 4 && gt.length >= 4 && (t.startsWith(gt) || gt.startsWith(t)))) {
          commonCount++;
          break;
        }
      }
    });

    if (commonCount < 2) {
      if ((aSquished.includes('cardtrack') && gSquished.includes('cardtrack')) ||
          (aSquished.includes('card') && aSquished.includes('track') && gSquished.includes('card') && gSquished.includes('track'))) {
        commonCount = Math.max(commonCount, 2);
      }
    }

    const overlapRatio = commonCount / Math.min(setA.size, setG.size);
    if (overlapRatio >= 0.5 && commonCount >= 2) {
      return true;
    }
  }

  return false;
}

function normalizePackageOrBundle(id = '') {
  return String(id).toLowerCase().trim();
}

/**
 * Normalizes custom pairing definitions from config.json into a standard array of pairing objects.
 * @param {any} input
 * @returns {Array<Object>}
 */
function getNormalizedPairings(input) {
  if (!input) return [];

  let raw = input;
  if (typeof input === 'object' && !Array.isArray(input)) {
    if (input.combinedApps || input.crossPlatformApps || input.pairedApps || input.multiPlatformApps || input.appPairings || input.pairs) {
      raw = input.combinedApps || input.crossPlatformApps || input.pairedApps || input.multiPlatformApps || input.appPairings || input.pairs;
    }
  }

  if (!raw) return [];

  const result = [];

  const extractItem = (item, defaultName = '') => {
    if (!item) return null;

    if (Array.isArray(item)) {
      const [id1 = '', id2 = ''] = item;
      return {
        id: `pair-${id1 || id2}`,
        name: defaultName || id1 || id2,
        googlePackageName: id1,
        appleBundleId: id2,
        android: id1,
        ios: id2
      };
    }

    if (typeof item === 'object') {
      const name = item.name || item.displayName || item.title || item.appName || defaultName || 'Combined App';
      const googlePackageName = item.android || item.google || item.googlePackageName || item.playStore || item.packageName || item.androidPackage || '';
      const appleBundleId = item.ios || item.apple || item.appleBundleId || item.appStore || item.bundleId || item.iosBundle || '';
      const ignore = Boolean(item.ignore || item.ignored);
      const consoleAppId = item.consoleAppId || item.playConsoleAppId || null;

      if (googlePackageName || appleBundleId) {
        return {
          id: item.id || `pair-${googlePackageName || appleBundleId}`,
          name,
          googlePackageName,
          appleBundleId,
          android: googlePackageName,
          ios: appleBundleId,
          ignore,
          consoleAppId
        };
      }
    }
    return null;
  };

  if (Array.isArray(raw)) {
    raw.forEach((item, index) => {
      const parsed = extractItem(item, `Combined App ${index + 1}`);
      if (parsed) result.push(parsed);
    });
  } else if (typeof raw === 'object') {
    Object.entries(raw).forEach(([keyName, item]) => {
      const parsed = extractItem(item, keyName);
      if (parsed) result.push(parsed);
    });
  }

  return result;
}

/**
 * Matches and pairs Android and iOS apps according to manual configuration and automated name heuristic.
 * @param {Array<Object>} [googleApps=[]]
 * @param {Array<Object>} [appleApps=[]]
 * @param {Array<Object>} [manualPairings=[]]
 * @returns {{paired: Array<Object>, unpairedGoogle: Array<Object>, unpairedApple: Array<Object>}}
 */
function matchAndPairApps(googleApps = [], appleApps = [], manualPairings = []) {
  const paired = [];
  const usedGooglePackages = new Set();
  const usedAppleBundles = new Set();

  const normalizedPairs = getNormalizedPairings(manualPairings);

  if (normalizedPairs.length > 0) {
    normalizedPairs.forEach(pair => {
      if (pair.ignore) return;
      const gApp = googleApps.find(g => pair.googlePackageName && normalizePackageOrBundle(g.packageName) === normalizePackageOrBundle(pair.googlePackageName));
      const aApp = appleApps.find(a => pair.appleBundleId && normalizePackageOrBundle(a.bundleId || a.packageName) === normalizePackageOrBundle(pair.appleBundleId));

      if (gApp || aApp) {
        if (gApp) usedGooglePackages.add(gApp.packageName);
        if (aApp) usedAppleBundles.add(aApp.bundleId || aApp.packageName);
        paired.push({
          id: pair.id || `pair-${pair.googlePackageName || pair.appleBundleId}`,
          name: pair.name || (gApp ? gApp.name : aApp.name),
          googleApp: gApp || null,
          appleApp: aApp || null,
          isManual: true,
          consoleAppId: pair.consoleAppId || gApp?.consoleAppId || null
        });
      }
    });
  }

  googleApps.forEach(gApp => {
    if (usedGooglePackages.has(gApp.packageName)) return;

    const match = appleApps.find(aApp => {
      if (usedAppleBundles.has(aApp.bundleId || aApp.packageName)) return false;
      return isSimilarAppName(aApp.name, gApp.name, aApp.bundleId || aApp.packageName, gApp.packageName);
    });

    if (match) {
      usedGooglePackages.add(gApp.packageName);
      usedAppleBundles.add(match.bundleId || match.packageName);
      
      const sigG = getAppSignature(gApp.name);
      const sigA = getAppSignature(match.name);
      const displayName = sigG.cleanName.length <= sigA.cleanName.length ? sigG.cleanName : sigA.cleanName;

      paired.push({
        id: `pair-${gApp.packageName.split('.').pop()}`,
        name: displayName,
        googleApp: gApp,
        appleApp: match,
        isManual: false
      });
    }
  });

  const unpairedGoogle = googleApps.filter(g => !usedGooglePackages.has(g.packageName));
  const unpairedApple = appleApps.filter(a => !usedAppleBundles.has(a.bundleId || a.packageName));

  return { paired, unpairedGoogle, unpairedApple };
}

/**
 * Release & Version Correlation Engine:
 * Maps app version releases onto daily trend metrics (installs, uninstalls, crash rates).
 * @param {Array<Object>} [dailyTrends=[]]
 * @param {Array<Object>} [releases=[]]
 * @param {string|null} [packageName=null]
 * @param {string|null} [platform=null]
 * @returns {Array<Object>}
 */
function correlateReleases(dailyTrends = [], releases = [], packageName = null, platform = null) {
  if (!dailyTrends || dailyTrends.length === 0 || !releases || releases.length === 0) {
    return [];
  }

  const filteredReleases = releases.filter(rel => {
    if (packageName && packageName !== 'all') {
      const relPkg = rel.packageName || rel.bundleId || rel.appId;
      if (!relPkg || relPkg === 'all') return false;
      const relPkgNorm = String(relPkg).trim().toLowerCase().replace(/[-_]/g, '');
      const targetPkgNorm = String(packageName).trim().toLowerCase().replace(/[-_]/g, '');
      if (relPkgNorm !== targetPkgNorm) {
        return false;
      }
    }
    if (platform && platform !== 'all' && rel.platform && rel.platform !== 'both' && rel.platform !== 'all' && rel.platform !== platform) {
      return false;
    }
    return true;
  });

  const trendsByDate = new Map(dailyTrends.map(t => [t.date, t]));

  return filteredReleases.map(rel => {
    const relDateStr = rel.releaseDate ? rel.releaseDate.substring(0, 10) : null;
    if (!relDateStr || !trendsByDate.has(relDateStr)) {
      return { ...rel, impact: null };
    }

    const dates = Array.from(trendsByDate.keys()).sort();
    const idx = dates.indexOf(relDateStr);

    const preSlice = dates.slice(Math.max(0, idx - 7), idx).map(d => trendsByDate.get(d));
    const postSlice = dates.slice(idx, Math.min(dates.length, idx + 8)).map(d => trendsByDate.get(d));

    const avgPreInstalls = preSlice.length > 0 ? preSlice.reduce((s, t) => s + (t.dailyInstalls || 0), 0) / preSlice.length : 0;
    const avgPostInstalls = postSlice.length > 0 ? postSlice.reduce((s, t) => s + (t.dailyInstalls || 0), 0) / postSlice.length : 0;

    const avgPreCrashes = preSlice.length > 0 ? preSlice.reduce((s, t) => s + (t.crashRate || 0), 0) / preSlice.length : 0;
    const avgPostCrashes = postSlice.length > 0 ? postSlice.reduce((s, t) => s + (t.crashRate || 0), 0) / postSlice.length : 0;

    const avgPreUninstalls = preSlice.length > 0 ? preSlice.reduce((s, t) => s + (t.dailyUninstalls || 0), 0) / preSlice.length : 0;
    const avgPostUninstalls = postSlice.length > 0 ? postSlice.reduce((s, t) => s + (t.dailyUninstalls || 0), 0) / postSlice.length : 0;

    return {
      ...rel,
      impact: {
        installDeltaPct: avgPreInstalls > 0 ? parseFloat((((avgPostInstalls - avgPreInstalls) / avgPreInstalls) * 100).toFixed(2)) : 0,
        uninstallDeltaPct: avgPreUninstalls > 0 ? parseFloat((((avgPostUninstalls - avgPreUninstalls) / avgPreUninstalls) * 100).toFixed(2)) : 0,
        crashRateDeltaPct: avgPreCrashes > 0 ? parseFloat((((avgPostCrashes - avgPreCrashes) / avgPreCrashes) * 100).toFixed(2)) : 0,
        avgPreInstalls: Math.round(avgPreInstalls),
        avgPostInstalls: Math.round(avgPostInstalls),
        avgPreCrashes: parseFloat(avgPreCrashes.toFixed(4)),
        avgPostCrashes: parseFloat(avgPostCrashes.toFixed(4))
      }
    };
  });
}

/**
 * Retention & Churn Benchmarks Engine:
 * Computes survival rate trends and detects severe churn anomalies (> 2 sigma).
 * @param {Array<Object>} [dailyTrends=[]]
 * @returns {{survivalTrend: Array<Object>, churnAnomalies: Array<Object>}}
 */
function calculateRetentionBenchmarks(dailyTrends = []) {
  if (!dailyTrends || dailyTrends.length === 0) return { survivalTrend: [], churnAnomalies: [] };

  const uninstallsSeries = dailyTrends.map(t => t.dailyUninstalls || 0);
  const anomalies = zScoreAnomalies(uninstallsSeries, 7, 2.0);

  const churnAnomalies = anomalies.map(anom => ({
    date: dailyTrends[anom.index].date,
    uninstalls: dailyTrends[anom.index].dailyUninstalls || 0,
    zScore: parseFloat(anom.z.toFixed(2)),
    severity: Math.abs(anom.z) > 3.0 ? 'high' : 'medium'
  }));

  const survivalTrend = dailyTrends.map(t => {
    const survivalRate = t.totalInstalls > 0 && t.activeDevices !== undefined
      ? parseFloat(((t.activeDevices / t.totalInstalls) * 100).toFixed(2))
      : null;
    return {
      date: t.date,
      survivalRate,
      activeDevices: t.activeDevices,
      dailyInstalls: t.dailyInstalls,
      dailyUninstalls: t.dailyUninstalls
    };
  });

  return { survivalTrend, churnAnomalies };
}

/**
 * Ensures dailyTrends has a continuous entry for every date between startDate and endDate.
 * Fills any missing dates with 0-value metric entries to prevent gaps in charts and release correlations.
 * @param {Array<Object>} [trends=[]]
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Array<Object>}
 */
function fillContinuousDailyTrends(trends = [], startDate, endDate) {
  if (!startDate || !endDate) return trends || [];

  const existingMap = new Map();
  (trends || []).forEach(t => {
    if (t && t.date) {
      existingMap.set(t.date.substring(0, 10), t);
    }
  });

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return trends || [];
  }

  const result = [];
  let curr = new Date(start);

  while (curr <= end) {
    const dateStr = curr.toISOString().split('T')[0];
    if (existingMap.has(dateStr)) {
      result.push(existingMap.get(dateStr));
    } else {
      result.push({
        date: dateStr,
        dailyInstalls: 0,
        dailyUninstalls: 0,
        dailyUserInstalls: 0,
        dailyUserUninstalls: 0,
        netGrowth: 0,
        activeDevices: 0,
        upgrades: 0,
        revenue: 0,
        netRevenue: 0,
        impressions: 0,
        pageViews: 0,
        sessions: 0,
        crashes: 0
      });
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return result;
}

module.exports = {
  aggregateOverviews,
  getAppSignature,
  isSimilarAppName,
  getNormalizedPairings,
  matchAndPairApps,
  correlateReleases,
  calculateRetentionBenchmarks,
  fillContinuousDailyTrends
};
