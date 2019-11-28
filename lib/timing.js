const hitime = require('hitime');
const createLog = require('./log.js');
const analytics = (() => {
  try {
    return require('./analytics.js');
  } catch (e) {
    return null;
  }
})();

const slow = 100;

module.exports = function createTimer(name) {
  const log = createLog(name);

  return async ({ label, category, variable, func }) => {
    const start = hitime();
    const result = await func();
    const duration = hitime() - start;

    if (label) {
      const msg = `${label}: ${duration.toFixed(2)}ms`;

      if (duration < slow) {
        log.info(msg);
      } else {
        log.warn(msg);
      }
    }

    if (analytics && category && variable) {
      analytics.timing(category, variable, duration);
    }

    return result;
  };
};
