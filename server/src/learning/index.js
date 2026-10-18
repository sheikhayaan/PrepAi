/**
 * Public surface of the continuous-learning subsystem.
 *
 * Nothing here is imported by the SSE hot path except cached `getActive`
 * lookups; all heavy work is scheduled off the request path.
 */
module.exports = {
  versionRegistry: require('./versionRegistry'),
  featureStore: require('./featureStore'),
  selectionPolicy: require('./selectionPolicy'),
  calibration: require('./calibration'),
  evaluation: require('./evaluation'),
  personalization: require('./personalization'),
  scheduler: require('./scheduler'),
  statistics: require('./statistics'),
};
