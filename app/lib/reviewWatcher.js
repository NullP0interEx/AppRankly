const { db } = require('./db');
const { getPlayReviews, getAppleReviewsRSS } = require('./aso/scraper');
const { broadcastAlert } = require('./notifier');

/**
 * Checks for negative reviews (rating <= maxRating) across configured apps
 * and dispatches notifications via broadcastAlert if not already alerted.
 *
 * @param {Object} options
 * @param {Array<{ packageName: string, platform: string, appleId?: string }>} options.apps
 * @param {Object} options.notifierConfig - Notifier settings (webhookUrl, telegram, ntfy, etc.)
 * @param {number} [options.maxRating=3] - Max star rating to consider negative (default 3)
 * @returns {Promise<{ checked: number, newAlerts: number, alerts: Array }>}
 */
async function checkAndAlertReviews({ apps = [], notifierConfig = {}, maxRating = 3 } = {}) {
  const results = {
    checked: 0,
    newAlerts: 0,
    alerts: []
  };

  if (!db) {
    console.warn('[ReviewWatcher] SQLite DB unavailable, skipping review watch.');
    return results;
  }

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO negative_review_alerts 
    (review_id, package_name, platform, rating, author, title, body, alerted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const existsStmt = db.prepare(`
    SELECT review_id FROM negative_review_alerts WHERE review_id = ?
  `);

  for (const app of apps) {
    const { packageName, platform = 'google', appleId } = app;
    if (!packageName) continue;

    let reviews = [];
    try {
      if (platform === 'apple' || platform === 'ios') {
        const identifier = appleId || packageName;
        reviews = await getAppleReviewsRSS(identifier);
      } else {
        reviews = await getPlayReviews(packageName, 30);
      }
    } catch (err) {
      console.warn(`[ReviewWatcher] Failed fetching reviews for ${packageName} (${platform}):`, err.message);
      continue;
    }

    results.checked += reviews.length;

    for (const rev of reviews) {
      const rating = Number(rev.rating) || 5;
      if (rating > maxRating) continue;

      const reviewId = String(rev.id || `${platform}_${packageName}_${rev.author}_${rev.reviewDate || Date.now()}`);
      const alreadyAlerted = existsStmt.get(reviewId);

      if (!alreadyAlerted) {
        const author = rev.author || rev.userName || 'Anonymous';
        const title = rev.title || '';
        const body = rev.body || rev.text || '';

        insertStmt.run(
          reviewId,
          packageName,
          platform,
          rating,
          author,
          title,
          body
        );

        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        const alertTitle = `🚨 [${platform.toUpperCase()}] ${rating}★ Review for ${packageName}`;
        const alertMessage = `${stars}\nAuthor: ${author}${title ? `\n"${title}"` : ''}\n${body.substring(0, 300)}`;

        // Dispatch alert via notifier
        try {
          await broadcastAlert({
            title: alertTitle,
            message: alertMessage,
            topic: notifierConfig.topic,
            webhookUrl: notifierConfig.webhookUrl,
            slackWebhookUrl: notifierConfig.slackWebhookUrl,
            telegram: notifierConfig.telegram
          });
        } catch (dispatchErr) {
          console.warn(`[ReviewWatcher] Alert dispatch failed for review ${reviewId}:`, dispatchErr.message);
        }

        const alertItem = {
          reviewId,
          packageName,
          platform,
          rating,
          author,
          title,
          body
        };

        results.alerts.push(alertItem);
        results.newAlerts++;
      }
    }
  }

  return results;
}

/**
 * Retrieves negative review alerts from SQLite.
 *
 * @param {Object} filter
 * @param {string} [filter.packageName]
 * @param {string} [filter.platform]
 * @param {number} [filter.limit=50]
 * @returns {Array}
 */
function getRecentAlerts({ packageName, platform, limit = 50 } = {}) {
  if (!db) return [];

  let query = 'SELECT * FROM negative_review_alerts WHERE 1=1';
  const params = [];

  if (packageName) {
    query += ' AND package_name = ?';
    params.push(packageName);
  }
  if (platform) {
    query += ' AND platform = ?';
    params.push(platform);
  }

  query += ' ORDER BY alerted_at DESC LIMIT ?';
  params.push(limit);

  return db.prepare(query).all(...params);
}

module.exports = {
  checkAndAlertReviews,
  getRecentAlerts
};
