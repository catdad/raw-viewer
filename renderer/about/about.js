const name = 'about';
const style = true;

const pkg = require('../../package.json');
const dom = require('../tools/dom.js');
const appName = pkg.productName || pkg.name;
const analytics = require('../../lib/analytics.js');

module.exports = ({ events }) => {
  const elem = dom.children(
    dom.div(name),
    dom.children(
      dom.div('head'),
      dom.h1(`${appName} v${pkg.version}`)
    ),
    dom.children(
      dom.div('body'),
      dom.p('Powered by the fine open source projects:'),
      dom.linkBlock('credit', 'Electron', 'https://electronjs.org/'),
      dom.linkBlock('credit', 'ExifTool', 'https://www.sno.phy.queensu.ca/~phil/exiftool/'),
      dom.linkBlock('credit', 'DCRAW', 'https://www.cybercom.net/~dcoffin/dcraw/'),
    ),
    dom.children(
      dom.div('foot'),
      dom.children(
        dom.div('byline'),
        dom.link(appName, 'https://github.com/catdad/raw-viewer'),
        dom.text(' is made with '),
        dom.icon('favorite'),
        dom.text(' by '),
        dom.link('catdad', 'https://github.com/catdad')
      )
    )
  );

  events.on('about', () => {
    analytics.screenview('about');
    events.emit('modal', { content: elem });
  });

  return { style };
};
