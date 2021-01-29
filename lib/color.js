const is = require('./is.js');

function color(name, str) {
  if (is.main) {
    const chalk = require('chalk');
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
