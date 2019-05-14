/* eslint-disable no-console */

const { format } = require('util');
const color = require('./color.js');
const logging = true;
const slow = 100;

const now = (() => {
  // based on hitime
  // https://github.com/catdad/hitime/blob/751849429af17732c96f2062d09e4dc135b9b94c/index.js#L5-L14
  function getNanoSeconds() {
    const hr = process.hrtime();
    return hr[0] * 1e9 + hr[1];
  }

  const loadTime = getNanoSeconds();

  return () => {
    return (getNanoSeconds() - loadTime) / 1e6;
  };
})();

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

  function timer(label) {
    const start = now();

    return {
      done: () => {
        const duration = now() - start;
        const msg = `${label}: ${duration.toFixed(2)}ms`;

        if (duration < slow) {
          info(msg);
        } else {
          warn(msg);
        }
      }
    };
  }

  async function timing (label, func) {
    const t = timer(label);
    const result = await func();
    t.done();

    return result;
  }

  return { info, warn, error, trace, timing, timer };
};
