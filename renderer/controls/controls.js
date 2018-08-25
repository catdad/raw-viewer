const fs = require('fs');
const path = require('path');

const name = 'controls';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

module.exports = function ({ events }) {
  const elem = document.createElement('div');
  elem.className = name;

  return { elem, style };
};
