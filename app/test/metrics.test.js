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

// Test calculateRetentionBenchmarks
const sampleTrends = [
  { date: '2026-07-01', totalInstalls: 1000, activeDevices: 800, dailyUninstalls: 10 },
  { date: '2026-07-02', totalInstalls: 1020, activeDevices: 810, dailyUninstalls: 12 },
  { date: '2026-07-03', totalInstalls: 1050, activeDevices: 815, dailyUninstalls: 15 },
  { date: '2026-07-04', totalInstalls: 1070, activeDevices: 820, dailyUninstalls: 11 },
  { date: '2026-07-05', totalInstalls: 1090, activeDevices: 825, dailyUninstalls: 14 },
  { date: '2026-07-06', totalInstalls: 1100, activeDevices: 830, dailyUninstalls: 13 },
  { date: '2026-07-07', totalInstalls: 1110, activeDevices: 835, dailyUninstalls: 100 } // Spike
];
const benchmarks = calculateRetentionBenchmarks(sampleTrends);
assert.strictEqual(benchmarks.survivalTrend.length, 7);
assert.strictEqual(benchmarks.churnAnomalies.length, 1);
assert.strictEqual(benchmarks.churnAnomalies[0].date, '2026-07-07');

console.log("All metric tests passed!");

