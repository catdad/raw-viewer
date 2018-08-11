/* eslint-disable no-console */

module.exports = function createLog(name) {
  const header = '[' + name + ']';

  function info(msg, ...args) {
    console.log(`${header} ${msg}`, ...args);
  }

  function error(msg, ...args) {
    console.error(`${header} ${msg}`, ...args);
  }

  function trace(msg, ...args) {
    console.trace(`${header} ${msg}`, ...args);
  }

  function time(timer) {
    console.time(`${header} ${timer}`);
  }

  function timeEnd(timer) {
    console.timeEnd(`${header} ${timer}`);
  }

  return { info, error, trace, time, timeEnd };
};
