const statistics = require('./statistics');
const aggregator = require('./aggregator');
const revenue = require('./revenue');

module.exports = {
  ...statistics,
  ...aggregator,
  ...revenue
};
