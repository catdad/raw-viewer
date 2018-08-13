/* eslint-disable no-console */

const { format } = require('util');

module.exports = function createLog(name) {
  const header = '[' + name + ']';

  function serialize(...args) {
    return format(...args).split('\n').map(line => `${header} ${line}`).join('\n');
  }

  function info(...args) {
    console.log(serialize(...args));
  }

  function error(...args) {
    console.error(serialize(...args));
  }

  function trace(msg) {
    console.trace(`${header} ${msg}`);
  }

  function time(timer) {
    console.time(`${header} ${timer}`);
  }

  function timeEnd(timer) {
    console.timeEnd(`${header} ${timer}`);
  }

  return { info, error, trace, time, timeEnd };
};
