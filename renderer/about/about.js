const fs = require('fs');
const path = require('path');

const name = 'about';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

const pkg = require('../../package.json');
const dom = require('../tools/dom.js');
const appName = pkg.productName || pkg.name;

module.exports = ({ events }) => {
  const elem = dom.div(name);
  const head = dom.div('head');
  const body = dom.div('body');
  const foot = dom.div('foot');

  [head, body, foot].forEach(el => elem.appendChild(el));

  const title = dom.h1(`${appName} v${pkg.version}`);
  head.appendChild(title);

  body.appendChild(dom.p('Powered by the fine open source projects:'));

  [
    dom.linkBlock('credit', 'DCRAW', 'https://www.cybercom.net/~dcoffin/dcraw/'),
    dom.linkBlock('credit', 'ExifTool', 'https://www.sno.phy.queensu.ca/~phil/exiftool/'),
    dom.linkBlock('credit', 'Electron', 'https://electronjs.org/'),
  ].forEach(link => body.appendChild(link));

  [
    dom.link(appName, 'https://github.com/catdad/raw-viewer'),
    dom.text(' is made with 💛 by '),
    dom.link('catdad', 'https://github.com/catdad')
  ].forEach(el => foot.appendChild(el));

  events.on('about', () => {
    events.emit('modal', { content: elem });
  });

  return { style };
};
