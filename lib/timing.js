const hitime = require('hitime');
const createLog = require('./log.js');
const analytics = require('./analytics.js');

const slow = 100;

module.exports = function createTimer(name) {
  const log = createLog(name);

  function timer(label) {
    const start = hitime();

    return {
      done: () => {
        const duration = hitime() - start;
        const msg = `${label}: ${duration.toFixed(2)}ms`;

        if (duration < slow) {
          log.info(msg);
        } else {
          log.warn(msg);
        }

        return duration;
      }
    };
  }

  return async ({ label, category, variable, func }) => {
    const t = timer(label);
    const result = await func();
    const duration = t.done();

    if (category && variable) {
      analytics.timing(category, variable, duration);
    }

    return result;
  };

};
