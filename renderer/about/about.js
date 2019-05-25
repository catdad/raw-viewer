const name = 'about';
const style = true;

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
    dom.linkBlock('credit', 'Electron', 'https://electronjs.org/'),
    dom.linkBlock('credit', 'ExifTool', 'https://www.sno.phy.queensu.ca/~phil/exiftool/'),
    dom.linkBlock('credit', 'DCRAW', 'https://www.cybercom.net/~dcoffin/dcraw/'),
  ].forEach(link => body.appendChild(link));

  dom.children(
    foot,
    dom.children(
      dom.div('byline'),
      dom.link(appName, 'https://github.com/catdad/raw-viewer'),
      dom.text(' is made with '),
      dom.icon('favorite'),
      dom.text(' by '),
      dom.link('catdad', 'https://github.com/catdad')
    )
  );

  events.on('about', () => {
    events.emit('modal', { content: elem });
  });

  return { style };
};
