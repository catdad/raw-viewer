/* eslint-disable no-console */

module.exports = function createLog(name) {
  const header = '[' + name + ']';

  function info() {
    console.log(header, ...arguments);
  }

  function error() {
    console.error(header, ...arguments);
  }

  function trace() {
    console.trace(header, ...arguments);
  }

  function time(timer) {
    console.time(`${header} ${timer}`);
  }

  function timeEnd(timer) {
    console.timeEnd(`${header} ${timer}`);
  }

  return { info, error, trace, time, timeEnd };
};
