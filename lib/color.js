let chalk;

const is = {
  main: process.type === 'browser',
  renderer: process.type === 'renderer'
};

try {
  chalk = require('chalk');
} catch (e) { } // eslint-disable-line no-empty

function color(name, str) {
  if (is.main && chalk) {
    return chalk[name](str);
  }

  return str;
}

module.exports = {
  red: str => color('red', str),
  green: str => color('green', str),
  cyan: str => color('cyan', str),
  yellow: str => color('yellow', str),
  magenta: str => color('magenta', str)
};
