/* eslint-disable no-console */

const { format } = require('util');
const color = require('./color.js');
const logging = true;
const slow = 100;

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

  function warn(...args) {
    if (!logging) {
      return;
    }

    console.log(...color.red(serialize(...args)));
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

  async function timing (label, func) {
    const start = Date.now();
    const result = await func();
    const duration = Date.now() - start;

    if (duration < slow) {
      info(`${label}: ${duration}ms`);
    } else {
      warn(`${label}: ${duration}ms`);
    }

    return result;
  }

  return { info, warn, error, trace, time, timeEnd, timing };
};
