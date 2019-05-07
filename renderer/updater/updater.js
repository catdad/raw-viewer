const fs = require('fs');
const path = require('path');

const name = 'updater';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

const pkg = require('../../package.json');
const dom = require('../tools/dom.js');
const appName = pkg.productName || pkg.name;
const appVersion = pkg.version;

module.exports = ({ events }) => {
  const elem = dom.div(name);
  const head = dom.div('head');
  const foot = dom.div('foot');

  const title = dom.h1(`${appName} v${pkg.version}`);
  head.appendChild(title);

  [
    dom.link(appName, 'https://github.com/catdad/raw-viewer'),
    dom.text(' is made with 💛 by '),
    dom.link('catdad', 'https://github.com/catdad')
  ].forEach(el => foot.appendChild(el));

  events.on('check-for-update', () => {
    dom.empty(elem);
    elem.appendChild(head);

    const body = dom.div('body');
    body.appendChild(dom.text(appVersion));

    elem.appendChild(body);
    elem.appendChild(foot);

    events.emit('modal', { content: elem });
  });

  return { style };
};
