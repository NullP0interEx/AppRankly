const assert = require('assert');
const { getScrapedAppleStoreData, getScrapedPlayStoreData, getCachedStoreData } = require('../lib/scraper');
const { ensureAppSnapshot, startPortfolioJob, getPortfolioJobStatus, calculateDeterministicAsoAudit } = require('../lib/aso/portfolioJob');

async function runTests() {
  console.log('Testing ASO Scraped Cache Fallback & Portfolio Job...');

  // 1. Verify getCachedStoreData retrieves cached app data
  const cachedPlay = getCachedStoreData('io.github.zmsp.addaboard', 'google');
  assert(cachedPlay !== null, 'Cached Google Play data should exist for test app');
  assert.strictEqual(typeof cachedPlay.title, 'string', 'Cached data must contain title');

  // 2. Verify ensureAppSnapshot populates snapshot using cached data fallback
  const snapshot = await ensureAppSnapshot('io.github.zmsp.addaboard', 'google', { force: false });
  assert(snapshot !== null, 'Snapshot should be returned');
  assert(snapshot.title && snapshot.title.length > 0, 'Snapshot must have valid title');
  assert(snapshot.developer && snapshot.developer.length > 0, 'Snapshot must have developer');

  // 3. Verify deterministic ASO scoring logic
  const mockPkg = { packageName: 'io.test.app', name: 'Test App: Goal Tracker & Planner' };
  const mockMeta = {
    title: 'Test App: Goal Tracker & Planner',
    short_desc: 'Track habits and daily goals with clean analytics and reminders',
    description: 'Features include:\n• Daily habit tracking\n• Clean charts\n• Instant reminders',
    score: 4.8,
    ratings_count: 50
  };
  const audit = calculateDeterministicAsoAudit(mockPkg, mockMeta, 'play');
  assert(audit.score >= 50 && audit.score <= 100, `Audit score ${audit.score} should be between 50 and 100`);
  assert(audit.score !== 98, `Audit score should be realistically calculated, not hardcoded 98 (got ${audit.score})`);
  assert(Array.isArray(audit.improvements), 'Improvements should be an array');
  assert(audit.headline && audit.headline.length > 0, 'Audit must include headline');

  // Verify severely unoptimized app receives low score (< 50)
  const poorMeta = {
    title: 'App',
    short_desc: '',
    description: 'A simple app.',
    score: 0,
    ratings_count: 0
  };
  const poorAudit = calculateDeterministicAsoAudit({ packageName: 'io.poor.app' }, poorMeta, 'play');
  assert(poorAudit.score < 50, `Unoptimized app should score below 50, got ${poorAudit.score}`);

  // Verify Apple subtitle keyword redundancy detection
  const appleMeta = {
    title: 'Focus Timer: Pomodoro Tracker',
    subtitle: 'Best Focus Timer For Work',
    description: 'Track your focus intervals with pomodoro technique.',
    score: 4.6,
    ratings_count: 300
  };
  const appleAudit = calculateDeterministicAsoAudit({ packageName: 'com.timer.focus' }, appleMeta, 'apple');
  assert(appleAudit.improvements.some(i => i.type === 'redundancy'), 'Must flag duplicate keywords between title and subtitle');

  // 4. Verify portfolio job start and status
  const jobLaunch = startPortfolioJob('all', false);
  assert(jobLaunch.job !== null, 'Job object should be returned');
  assert(jobLaunch.job.id.startsWith('job_aso_'), 'Job ID should be formatted');
  
  const status = getPortfolioJobStatus();
  assert(status.status === 'running' || status.status === 'completed', 'Job status should be running or completed');

  // Cancel job to prevent running through all 25 packages during test
  const { cancelPortfolioJob } = require('../lib/aso/portfolioJob');
  cancelPortfolioJob();

  // 5. Verify withTimeout helper functionality
  const { withTimeout } = require('../lib/utils/timeout');
  const fastPromise = new Promise(resolve => setTimeout(() => resolve('fast_ok'), 50));
  const fastResult = await withTimeout(fastPromise, 300);
  assert.strictEqual(fastResult, 'fast_ok', 'Fast promise should resolve successfully');

  let timedOut = false;
  try {
    const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow_ok'), 500));
    await withTimeout(slowPromise, 100, 'Custom timeout triggered');
  } catch (err) {
    timedOut = true;
    assert(err.message.includes('Custom timeout triggered'), 'Error message should match custom timeout');
  }
  assert(timedOut, 'Slow promise should have timed out');

  // 6. Verify ensureAppSnapshot gracefully returns null for dormant / non-public app
  const dormantSnapshot = await ensureAppSnapshot('com.nonexistent.dormant.test.package.9999', 'google', { force: true, timeoutMs: 500 });
  assert.strictEqual(dormantSnapshot, null, 'Dormant or unlisted app should return null snapshot');

  // 7. Verify Apple App Store subtitle extraction & prompt inclusion
  const { getAppleLookup } = require('../lib/aso/scraper');
  const { buildAuditUserPrompt } = require('../lib/ai/prompts');
  const appleData = await getAppleLookup('io.github.zmsp.addaboard');
  assert(appleData, 'AddaBoard Apple lookup must return data');
  assert.strictEqual(appleData.subtitle, 'Turn Reels into Itineraries', 'Must extract exact Apple App Store subtitle');
  const promptText = buildAuditUserPrompt({
    platform: 'apple',
    metadata: appleData,
    packageName: 'io.github.zmsp.addaboard'
  });
  assert(promptText.includes('Turn Reels into Itineraries [Length: 27/30 characters]'), 'Must format extracted subtitle in AI audit prompt');

  console.log('✓ All ASO scraped cache and portfolio job tests passed!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
