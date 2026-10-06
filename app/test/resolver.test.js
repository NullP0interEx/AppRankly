const assert = require('assert');
const cache = require('../lib/cache');
const resolver = require('../lib/resolver');
const { migrate, db } = require('../lib/db/index');

async function testResolver() {
  console.log('Running resolver & cache tests...');

  // 1. Run migrations
  migrate();

  const runId = Date.now();
  const testResource = `test:resource:${runId}`;

  // 2. Test key normalization
  const key1 = cache.makeKey('stats', { platform: 'google', startDate: '2026-01-01', endDate: '2026-01-31' });
  const key2 = cache.makeKey('stats', { endDate: '2026-01-31', startDate: '2026-01-01', platform: 'google' });
  assert.strictEqual(key1, key2, 'Cache keys must be identical regardless of param order');

  // 3. Test resolve single-flight dedup
  let apiCallCount = 0;
  const mockFetch = async () => {
    apiCallCount++;
    await new Promise(r => setTimeout(r, 50));
    return { data: 'test_payload' };
  };

  const [res1, res2] = await Promise.all([
    resolver.resolve(testResource, { id: 1 }, mockFetch),
    resolver.resolve(testResource, { id: 1 }, mockFetch)
  ]);

  assert.strictEqual(apiCallCount, 1, 'External API fetch function should only be called ONCE for concurrent requests');
  assert.deepStrictEqual(res1, res2);

  // 4. Test Tier 1 cache hit
  const res3 = await resolver.resolve(testResource, { id: 1 }, async () => {
    throw new Error('Should not reach API when cached');
  });
  assert.deepStrictEqual(res3, { data: 'test_payload' });

  // 5. Test metrics output
  const metrics = resolver.getMetrics();
  console.log('Test Metrics:', metrics);
  assert.ok(metrics.totalHits >= 3);
  assert.strictEqual(metrics.inFlightCollapses, 1);

  console.log('All resolver tests passed successfully!');
}

testResolver().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
