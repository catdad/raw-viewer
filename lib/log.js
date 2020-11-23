/* eslint-disable no-console */

const { format } = require('util');
const color = require('./color.js');

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

  return { info, warn, error, trace };
};
