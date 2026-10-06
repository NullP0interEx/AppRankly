const statistics = require('./statistics');
const aggregator = require('./aggregator');

module.exports = {
  ...statistics,
  ...aggregator
};
