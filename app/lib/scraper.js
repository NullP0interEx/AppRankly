const path = require("path");
const fs = require("fs");
const axios = require("axios");
const gplayModule = require("google-play-scraper");
const gplay = gplayModule.default || gplayModule;
const resolver = require("./resolver");
const { DATA_DIR } = require("./config");
const { withTimeout } = require("./utils/timeout");

const PLAYSTORE_CACHE_FILE = path.join(DATA_DIR, "playstore_scrape_cache.json");
const APPSTORE_CACHE_FILE = path.join(DATA_DIR, "appstore_scrape_cache.json");

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

async function scrapeAppleWebPageDetails(trackViewUrl) {
  if (!trackViewUrl) return { subtitle: '', promotionalText: '' };
  try {
    const res = await axios.get(trackViewUrl, {
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    const html = res.data;
    if (typeof html !== 'string') return { subtitle: '', promotionalText: '' };

    let subtitle = '';
    const subMatch = html.match(/<(?:p|h2|span)[^>]*class="[^"]*\bsubtitle\b[^"]*"[^>]*>([\s\S]*?)<\/(?:p|h2|span)>/i);
    if (subMatch) {
      subtitle = decodeHtmlEntities(subMatch[1]);
    }

    let promotionalText = '';
    const promoMatch = html.match(/<(?:p|div|span)[^>]*class="[^"]*\b(?:promotional-text|promo-text)\b[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div|span)>/i);
    if (promoMatch) {
      promotionalText = decodeHtmlEntities(promoMatch[1]);
    }

    return { subtitle, promotionalText };
  } catch (err) {
    return { subtitle: '', promotionalText: '' };
  }
}

function getAppMetadataOverrides(identifier, bundleId) {
  try {
    const { getBaseConfig } = require("./config");
    const cfg = getBaseConfig();
    return cfg?.appMetadata?.[identifier] || (bundleId ? cfg?.appMetadata?.[bundleId] : null) || {};
  } catch (_) {
    return {};
  }
}

const getScrapedAppleStoreData = async (identifier, options = {}) => {
  if (!identifier) return null;
  const force = Boolean(options?.force);
  const cacheKey = force ? `scrape:apple:${Date.now()}` : 'scrape:apple';
  const result = await resolver.resolve(cacheKey, { identifier }, async () => {
    let cache = {};
    try {
      if (fs.existsSync(APPSTORE_CACHE_FILE)) {
        cache = JSON.parse(fs.readFileSync(APPSTORE_CACHE_FILE, "utf8"));
        if (!force && cache[identifier]?.data) {
          if (!cache[identifier].data.subtitle && (cache[identifier].data.trackViewUrl || cache[identifier].data.url)) {
            const webDetails = await scrapeAppleWebPageDetails(cache[identifier].data.trackViewUrl || cache[identifier].data.url);
            const metaOverrides = getAppMetadataOverrides(identifier, cache[identifier].data.bundleId);
            cache[identifier].data.subtitle = metaOverrides.subtitle || webDetails.subtitle || '';
            cache[identifier].data.promotionalText = metaOverrides.promotionalText || webDetails.promotionalText || '';
            try { fs.writeFileSync(APPSTORE_CACHE_FILE, JSON.stringify(cache, null, 2)); } catch {}
          }
          return cache[identifier].data;
        }
      }
    } catch (e) {}

    try {
      const isNumeric = /^\d+$/.test(identifier);
      const url = isNumeric
        ? `https://itunes.apple.com/lookup?id=${identifier}`
        : `https://itunes.apple.com/lookup?bundleId=${identifier}`;

      const res = await axios.get(url, { timeout: 8000 });
      if (res.data && res.data.results && res.data.results.length > 0) {
        const item = res.data.results[0];
        const icon = item.artworkUrl512 || item.artworkUrl100 || item.artworkUrl60 || '';
        const webDetails = await scrapeAppleWebPageDetails(item.trackViewUrl);
        const metaOverrides = getAppMetadataOverrides(identifier, item.bundleId);
        const subtitle = metaOverrides.subtitle || webDetails.subtitle || '';
        const promotionalText = metaOverrides.promotionalText || webDetails.promotionalText || '';

        const scraped = {
          title: item.trackName,
          trackName: item.trackName,
          subtitle,
          promotionalText,
          iconUrl: icon,
          icon: icon,
          summary: item.description ? item.description.substring(0, 200) + '...' : '',
          description: item.description || '',
          descriptionHTML: item.description || '',
          scoreText: item.averageUserRating ? item.averageUserRating.toFixed(1) : 'N/A',
          score: item.averageUserRating || 0,
          ratings: item.userRatingCount || 0,
          reviews: item.userRatingCount || 0,
          installs: 'N/A',
          minInstalls: 0,
          genre: item.primaryGenreName,
          developer: item.sellerName || item.artistName,
          developerId: item.artistId,
          developerWebsite: item.sellerUrl,
          priceText: item.formattedPrice || (item.price === 0 ? 'Free' : `$${item.price}`),
          free: item.price === 0,
          version: item.version,
          updated: item.currentVersionReleaseDate || item.releaseDate,
          url: item.trackViewUrl,
          trackViewUrl: item.trackViewUrl,
          screenshots: Array.isArray(item.screenshotUrls)
            ? (item.ipadScreenshotUrls ? item.screenshotUrls.concat(item.ipadScreenshotUrls) : item.screenshotUrls)
            : [],
          adamId: item.trackId,
          bundleId: item.bundleId
        };
        cache[identifier] = { timestamp: Date.now(), data: scraped };
        try { fs.writeFileSync(APPSTORE_CACHE_FILE, JSON.stringify(cache, null, 2)); } catch {}
        return scraped;
      }
    } catch (err) {
      console.error(`Could not scrape App Store metadata for ${identifier}:`, err.message);
      if (cache[identifier]?.data) {
        return cache[identifier].data;
      }
    }
    return cache[identifier]?.data || null;
  });

  if (result) {
    if (!result.iconUrl && result.icon) result.iconUrl = result.icon;
    if (!result.icon && result.iconUrl) result.icon = result.iconUrl;
    if (!result.title && result.trackName) result.title = result.trackName;
    if (!result.trackName && result.title) result.trackName = result.title;
    if (!result.url && result.trackViewUrl) result.url = result.trackViewUrl;
    if (!result.description && result.descriptionHTML) result.description = result.descriptionHTML;
  }
  return result;
};

const getScrapedPlayStoreData = async (appId, options = {}) => {
  if (!appId) return null;
  const force = Boolean(options?.force);
  const cacheKey = force ? `scrape:google:${Date.now()}` : 'scrape:google';
  const result = await resolver.resolve(cacheKey, { appId }, async () => {
    let cache = {};
    try {
      if (fs.existsSync(PLAYSTORE_CACHE_FILE)) {
        cache = JSON.parse(fs.readFileSync(PLAYSTORE_CACHE_FILE, "utf8"));
        if (!force && cache[appId]?.data) {
          return cache[appId].data;
        }
      }
    } catch (e) {}

    try {
      const data = await withTimeout(gplay.app({ appId }), 8000, `Play Store scraper timed out for ${appId}`);
      const scraped = {
        title: data.title,
        iconUrl: data.icon,
        icon: data.icon,
        summary: data.summary || '',
        description: data.description || data.descriptionHTML || '',
        descriptionHTML: data.descriptionHTML || data.description || '',
        scoreText: data.scoreText,
        score: data.score,
        ratings: data.ratings,
        reviews: data.reviews,
        installs: data.installs,
        minInstalls: data.minInstalls,
        genre: data.genre,
        developer: data.developer,
        developerId: data.developerId,
        developerEmail: data.developerEmail,
        developerWebsite: data.developerWebsite,
        priceText: data.priceText,
        free: data.free,
        version: data.version,
        updated: data.updated,
        url: data.url,
        headerImage: data.headerImage || '',
        screenshots: Array.isArray(data.screenshots) ? data.screenshots : []
      };
      cache[appId] = { timestamp: Date.now(), data: scraped };
      try { fs.writeFileSync(PLAYSTORE_CACHE_FILE, JSON.stringify(cache, null, 2)); } catch {}
      return scraped;
    } catch (err) {
      console.warn(`Could not scrape Play Store metadata for ${appId}:`, err.message);
      if (cache[appId]?.data) {
        return cache[appId].data;
      }
      return null;
    }
  });

  if (result) {
    if (!result.iconUrl && result.icon) result.iconUrl = result.icon;
    if (!result.icon && result.iconUrl) result.icon = result.iconUrl;
    if (!result.description && result.descriptionHTML) result.description = result.descriptionHTML;
  }
  return result;
};

const getCachedStoreData = (identifier, platform) => {
  if (!identifier) return null;
  const isApple = platform === 'apple' || platform === 'ios';
  const file = isApple ? APPSTORE_CACHE_FILE : PLAYSTORE_CACHE_FILE;
  try {
    if (fs.existsSync(file)) {
      const cache = JSON.parse(fs.readFileSync(file, "utf8"));
      return cache[identifier]?.data || null;
    }
  } catch (e) {}
  return null;
};

module.exports = {
  getScrapedAppleStoreData,
  getScrapedPlayStoreData,
  getCachedStoreData,
  decodeHtmlEntities,
  scrapeAppleWebPageDetails,
  APPSTORE_CACHE_FILE,
  PLAYSTORE_CACHE_FILE
};

