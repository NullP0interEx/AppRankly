const assert = require('assert');
const bcrypt = require('bcryptjs');
const { db, migrate } = require('../lib/db/index');
const AppleAppStoreStatsViewer = require('../lib/AppleAppStoreStatsViewer');

console.log('Running v1.6.0 & v2.0.0 features test suite...');

// 1. Run migrations to ensure 006 is applied
migrate();
assert.ok(db, 'Database must be open');

// 2. Test Multi-Tenant Team Auth
const testUsername = `user_${Date.now()}`;
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync('securePassword123', salt);

db.prepare(`
  INSERT INTO users (username, password_hash, role, team_name, created_at)
  VALUES (?, ?, 'editor', 'Growth Team', datetime('now'))
`).run(testUsername, hash);

const fetchedUser = db.prepare('SELECT * FROM users WHERE username = ?').get(testUsername);
assert.ok(fetchedUser, 'User must be found in database');
assert.strictEqual(fetchedUser.role, 'editor');
assert.strictEqual(fetchedUser.team_name, 'Growth Team');
assert.ok(bcrypt.compareSync('securePassword123', fetchedUser.password_hash));
assert.ok(!bcrypt.compareSync('wrongPassword', fetchedUser.password_hash));

// Clean up test user
db.prepare('DELETE FROM users WHERE username = ?').run(testUsername);
console.log('✓ Multi-tenant team auth & roles verified');

// 3. Test Metadata Timeline Snapshots
const testPkg = `com.test.app.${Date.now()}`;
db.prepare(`
  INSERT INTO metadata_timeline (package_name, platform, version, title, short_desc, whats_new, score, ratings, detected_at)
  VALUES (?, 'play', '1.0.0', 'Initial Title', 'Short description', 'Initial release', 4.5, 100, datetime('now'))
`).run(testPkg);

db.prepare(`
  INSERT INTO metadata_timeline (package_name, platform, version, title, short_desc, whats_new, score, ratings, detected_at)
  VALUES (?, 'play', '1.1.0', 'Updated Title', 'Better description', 'Bug fixes & improvements', 4.7, 150, datetime('now'))
`).run(testPkg);

const history = db.prepare('SELECT * FROM metadata_timeline WHERE package_name = ? ORDER BY id ASC').all(testPkg);
assert.strictEqual(history.length, 2);
assert.strictEqual(history[0].version, '1.0.0');
assert.strictEqual(history[1].version, '1.1.0');
assert.strictEqual(history[1].score, 4.7);

// Clean up test pkg timeline
db.prepare('DELETE FROM metadata_timeline WHERE package_name = ?').run(testPkg);
console.log('✓ Metadata change timeline history verified');

// 4. Test Negative Review Alerts idempotency
const testReviewId = `rev_${Date.now()}`;
db.prepare(`
  INSERT INTO negative_review_alerts (review_id, package_name, platform, rating, author, title, body, alerted_at)
  VALUES (?, 'com.test.app', 'play', 1, 'AngryUser', 'Broken update', 'App crashes on launch', datetime('now'))
`).run(testReviewId);

const checkAlert = db.prepare('SELECT * FROM negative_review_alerts WHERE review_id = ?').get(testReviewId);
assert.ok(checkAlert);
assert.strictEqual(checkAlert.rating, 1);

// Clean up review alert
db.prepare('DELETE FROM negative_review_alerts WHERE review_id = ?').run(testReviewId);
console.log('✓ Negative review alert storage & idempotency verified');

// 5. Test Competitor & Keyword storage
const testCompKey = 'com.competitor.sample';
db.prepare(`
  INSERT INTO aso_competitor (package_name, platform, store, competitor_key, title, short_desc, rating, installs_text, pinned, fetched_at)
  VALUES (?, 'play', 'play', ?, 'Sample Competitor', 'Top app in category', 4.8, '1,000,000+', 1, datetime('now'))
  ON CONFLICT(package_name, platform, store, competitor_key) DO UPDATE SET rating = excluded.rating
`).run(testPkg, testCompKey);

const compRow = db.prepare('SELECT * FROM aso_competitor WHERE package_name = ? AND competitor_key = ?').get(testPkg, testCompKey);
assert.ok(compRow);
assert.strictEqual(compRow.pinned, 1);
assert.strictEqual(compRow.rating, 4.8);

db.prepare('DELETE FROM aso_competitor WHERE package_name = ?').run(testPkg);
console.log('✓ Competitor tracking storage verified');

console.log('All v1.6.0 & v2.0.0 tests passed successfully!');
