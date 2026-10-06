/**
 * Metrics facade module.
 * Re-exports time-series statistics and cross-platform portfolio aggregation.
 */
const statistics = require('./metrics/statistics');
const aggregator = require('./metrics/aggregator');

module.exports = {
  ...statistics,
  ...aggregator
};
