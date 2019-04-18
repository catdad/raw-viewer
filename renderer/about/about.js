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
  elem.appendChild(dom.p('Powered by the fine open source projects:'));

  [
    dom.linkBlock('credit', 'DCRAW', 'https://www.cybercom.net/~dcoffin/dcraw/'),
    dom.linkBlock('credit', 'ExifTool', 'https://www.sno.phy.queensu.ca/~phil/exiftool/'),
    dom.linkBlock('credit', 'Electron', 'https://electronjs.org/'),
  ].forEach(link => elem.appendChild(link));

  events.on('about', () => {
    events.emit('modal', { content: elem });
  });

  return { style };
};
