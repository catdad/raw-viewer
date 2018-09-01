/* eslint-disable no-console */

const { format } = require('util');
const logging = true;

module.exports = function createLog(name) {
  const header = '[' + name + ']';

  function serialize(...args) {
    return format(...args).split('\n').map(line => `${header} ${line}`).join('\n');
  }

  function info(...args) {
    if (!logging) {
      return;
    }

    console.log(serialize(...args));
  }

  function error(...args) {
    if (!logging) {
      return;
    }

    console.error(serialize(...args));
  }

  function trace(msg) {
    if (!logging) {
      return;
    }

    console.trace(`${header} ${msg}`);
  }

  function time(timer) {
    if (!logging) {
      return;
    }

    console.time(`${header} ${timer}`);
  }

  function timeEnd(timer) {
    if (!logging) {
      return;
    }

    console.timeEnd(`${header} ${timer}`);
  }

  return { info, error, trace, time, timeEnd };
};
