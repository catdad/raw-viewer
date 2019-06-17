let chalk;

const is = require('./is.js');

try {
  chalk = require('chalk');
} catch (e) { } // eslint-disable-line no-empty

function color(name, str) {
  if (is.main && chalk) {
    return [chalk[name](str)];
  } else if (is.renderer) {
    return [`%c${str}`, `color: ${name}`];
  }

  return [str];
}

module.exports = {
  red: str => color('red', str),
  green: str => color('green', str),
  cyan: str => color('cyan', str),
  yellow: str => color('yellow', str),
  magenta: str => color('magenta', str)
};
