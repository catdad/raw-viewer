/* eslint-disable no-console */

const { format, deprecate } = require('util');
const now = require('hitime');
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

  return {
    info, warn, error, trace,
    timing: deprecate(timing, 'Use timing module instead'),
    timer: deprecate(timer, 'Just don\'t')
  };
};
