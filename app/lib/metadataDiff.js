const { db } = require('./db');

/**
 * Computes word-level diff between two strings.
 * Returns added and removed words.
 */
function diffWords(strA = '', strB = '') {
  if (strA === strB) return { identical: true, added: [], removed: [] };

  const wordsA = strA.trim().split(/\s+/).filter(Boolean);
  const wordsB = strB.trim().split(/\s+/).filter(Boolean);

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);

  const added = wordsB.filter(w => !setA.has(w));
  const removed = wordsA.filter(w => !setB.has(w));

  return {
    identical: added.length === 0 && removed.length === 0,
    added,
    removed
  };
}

/**
 * Compares two metadata objects and returns changed fields.
 */
function diffMetadata(prev = {}, curr = {}) {
  const fields = ['title', 'subtitle', 'short_desc', 'description', 'whats_new', 'version'];
  const changes = {};
  let hasChanges = false;

  for (const field of fields) {
    const valPrev = (prev[field] || '').trim();
    const valCurr = (curr[field] || '').trim();

    if (valPrev !== valCurr) {
      hasChanges = true;
      const wordDiff = diffWords(valPrev, valCurr);
      changes[field] = {
        oldValue: valPrev,
        newValue: valCurr,
        addedWords: wordDiff.added,
        removedWords: wordDiff.removed
      };
    }
  }

  // Also track score/rating jumps
  if (prev.score !== undefined && curr.score !== undefined && Number(prev.score) !== Number(curr.score)) {
    hasChanges = true;
    changes.score = {
      oldValue: prev.score,
      newValue: curr.score
    };
  }

  return {
    changed: hasChanges,
    changes
  };
}

/**
 * Persists metadata snapshot if changes detected vs last known snapshot.
 *
 * @param {Object} metadata
 * @param {string} metadata.packageName
 * @param {string} metadata.platform
 * @param {string} [metadata.version]
 * @param {string} [metadata.title]
 * @param {string} [metadata.shortDesc]
 * @param {string} [metadata.subtitle]
 * @param {string} [metadata.description]
 * @param {string} [metadata.whatsNew]
 * @param {number} [metadata.score]
 * @param {number} [metadata.ratings]
 * @returns {Object} { recorded: boolean, diff: Object }
 */
function recordMetadataSnapshot(metadata) {
  if (!db) return { recorded: false, reason: 'no_db' };

  const {
    packageName,
    platform = 'google',
    version = '',
    title = '',
    shortDesc = '',
    subtitle = '',
    description = '',
    whatsNew = '',
    score = 0,
    ratings = 0
  } = metadata;

  if (!packageName) return { recorded: false, reason: 'missing_package_name' };

  const latestStmt = db.prepare(`
    SELECT * FROM metadata_timeline 
    WHERE package_name = ? AND platform = ? 
    ORDER BY detected_at DESC LIMIT 1
  `);
  const prevRow = latestStmt.get(packageName, platform);

  const prevNormalized = prevRow ? {
    title: prevRow.title || '',
    subtitle: prevRow.subtitle || '',
    short_desc: prevRow.short_desc || '',
    description: prevRow.description || '',
    whats_new: prevRow.whats_new || '',
    version: prevRow.version || '',
    score: prevRow.score,
    ratings: prevRow.ratings
  } : null;

  const currentNormalized = {
    title,
    subtitle,
    short_desc: shortDesc,
    description,
    whats_new: whatsNew,
    version,
    score,
    ratings
  };

  const diffResult = prevNormalized ? diffMetadata(prevNormalized, currentNormalized) : { changed: true, changes: { initial: true } };

  if (diffResult.changed) {
    const insertStmt = db.prepare(`
      INSERT INTO metadata_timeline 
      (package_name, platform, version, title, short_desc, subtitle, description, whats_new, score, ratings, detected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    insertStmt.run(
      packageName,
      platform,
      version,
      title,
      shortDesc,
      subtitle,
      description,
      whatsNew,
      score,
      ratings
    );

    return { recorded: true, diff: diffResult.changes };
  }

  return { recorded: false, diff: null };
}

/**
 * Retrieves timeline snapshots and computes sequential diffs.
 */
function getTimeline(packageName, platform, limit = 50) {
  if (!db) return [];

  let query = 'SELECT * FROM metadata_timeline WHERE 1=1';
  const params = [];

  if (packageName) {
    query += ' AND package_name = ?';
    params.push(packageName);
  }
  if (platform) {
    query += ' AND platform = ?';
    params.push(platform);
  }

  query += ' ORDER BY detected_at DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(query).all(...params);

  // Compute diffs against the preceding timeline entry
  return rows.map((row, idx) => {
    const nextOlder = rows[idx + 1];
    let diff = null;
    if (nextOlder) {
      diff = diffMetadata(nextOlder, row).changes;
    }
    return {
      ...row,
      diff
    };
  });
}

module.exports = {
  diffWords,
  diffMetadata,
  recordMetadataSnapshot,
  getTimeline
};
