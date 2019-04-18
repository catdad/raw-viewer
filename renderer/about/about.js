const fs = require('fs');
const path = require('path');

const pkg = require('../../package.json');
const dom = require('../tools/dom.js');

const name = 'about';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

module.exports = ({ events }) => {
  const elem = dom.div(name);
  const title = dom.h1(`${pkg.productName || pkg.name} v${pkg.version}`);

  elem.appendChild(title);

  events.on('about', () => {
    events.emit('modal', { content: elem });
  });

  return { style };
};
