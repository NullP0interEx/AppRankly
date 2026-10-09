const assert = require('assert');
const {
  movingAverage,
  percentChange,
  churnRate,
  installSurvival,
  aggregateOverviews,
  matchAndPairApps,
  correlateReleases,
  calculateRetentionBenchmarks
} = require('../lib/metrics');

// Test movingAverage
const series = [1, 2, 3, 4, 5];
assert.deepStrictEqual(movingAverage(series, 3), [null, null, 2, 3, 4]);

// Test percentChange
assert.strictEqual(percentChange(150, 100), 0.5);
assert.strictEqual(percentChange(100, 150), -0.3333333333333333);
assert.strictEqual(percentChange(100, 0), null);

// Test churnRate
assert.strictEqual(churnRate(50, 1000), 0.05);
assert.strictEqual(churnRate(0, 1000), 0);
assert.strictEqual(churnRate(50, 0), null);

// Test installSurvival
assert.strictEqual(installSurvival(500, 1000), 0.5);
assert.strictEqual(installSurvival(0, 1000), 0);
assert.strictEqual(installSurvival(500, 0), null);

// Test aggregateOverviews
const overviews = [
  {
    overview: {
      currentlyActiveDevices: 100,
      totalInstallCountByUser: 200,
      dailyTrends: [{ date: '2026-07-01', activeDevices: 100, dailyInstalls: 5 }]
    },
    name: 'app1'
  },
  {
    overview: {
      currentlyActiveDevices: 50,
      totalInstallCountByUser: 100,
      dailyTrends: [{ date: '2026-07-01', activeDevices: 50, dailyInstalls: 2 }]
    },
    name: 'app2'
  }
];

const aggregated = aggregateOverviews(overviews);
assert.strictEqual(aggregated.currentlyActiveDevices, 150);
assert.strictEqual(aggregated.totalInstallCountByUser, 300);
assert.strictEqual(aggregated.dailyTrends[0].activeDevices, 150);
assert.strictEqual(aggregated.dailyTrends[0].dailyInstalls, 7);
assert.ok(aggregated.appTrends['app1'].dailyTrends);
assert.ok(aggregated.appTrends['app1'].trends);
assert.strictEqual(aggregated.appTrends['app1'].trends[0].dailyInstalls, 5);

// Test matchAndPairApps
const gApps = [
  { name: 'CardTrack (Android)', packageName: 'io.github.zmsp.cardtrack' },
  { name: 'InstaBoard', packageName: 'io.github.zmsp.instaboard' }
];
const aApps = [
  { name: 'CardTrack (App Store)', bundleId: 'io.github.zmsp.cardtrack' },
  { name: 'SoloApp', bundleId: 'com.solo.app' }
];
const manual = [{ id: 'custom-1', googlePackageName: 'io.github.zmsp.instaboard', appleBundleId: 'com.solo.app' }];

const pairedResult = matchAndPairApps(gApps, aApps, manual);
assert.strictEqual(pairedResult.paired.length, 2);
assert.strictEqual(pairedResult.paired[0].isManual, true);
assert.strictEqual(pairedResult.paired[1].isManual, false);
assert.strictEqual(pairedResult.paired[1].googleApp.packageName, 'io.github.zmsp.cardtrack');

// Test ignored pairing in matchAndPairApps
const manualWithIgnore = [
  { id: 'custom-1', googlePackageName: 'io.github.zmsp.instaboard', appleBundleId: 'com.solo.app', ignore: true }
];
const pairedIgnoreResult = matchAndPairApps(gApps, aApps, manualWithIgnore);
assert.strictEqual(pairedIgnoreResult.paired.length, 1);
assert.strictEqual(pairedIgnoreResult.paired[0].isManual, false);

// Test viewerFactory getIgnoredSet & isIgnored
const { getIgnoredSet, isIgnored } = require('../lib/viewerFactory');
const mockConfig = {
  ignoredPackages: ['io.github.zmsp.tapscore', 'Score Watch Tap']
};
const ignoredSet = getIgnoredSet(mockConfig);
assert.ok(ignoredSet.has('io.github.zmsp.tapscore'));
assert.ok(ignoredSet.has('score watch tap'));
assert.strictEqual(isIgnored({ packageName: 'io.github.zmsp.tapscore', name: 'Score Watch Tap' }, ignoredSet), true);
assert.strictEqual(isIgnored({ bundleId: 'io.github.zmsp.tapscore', name: 'Score Watch Tap' }, ignoredSet), true);
assert.strictEqual(isIgnored({ name: 'Score Watch Tap' }, ignoredSet), true);
assert.strictEqual(isIgnored({ packageName: 'io.github.zmsp.cardtrack', name: 'CardTrack' }, ignoredSet), false);

console.log("All metric tests passed!");

