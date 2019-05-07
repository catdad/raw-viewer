const fs = require('fs');
const path = require('path');
const https = require('https');
const { promisify } = require('util');
const { finished } = require('stream');
const semver = require('semver');

const name = 'updater';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');
const log = require('../../lib/log.js')(name);

const pkg = require('../../package.json');
const dom = require('../tools/dom.js');
const appName = pkg.productName || pkg.name;
const appVersion = pkg.version;

const get = async (url) => {
  const res = await new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'user-agent': `Raw-Viewer-v${appVersion}` }
    }, res => resolve(res)).on('error', err => reject(err));
  });

  if (res.statusCode !== 200) {
    throw new Error(`unexpected response ${res.statusCode} ${res.statusMessage}`);
  }

  const chunks = [];
  res.on('data', chunk => chunks.push(chunk));

  await promisify(finished)(res);

  return Buffer.concat(chunks);
};

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

  events.on('check-for-update', async () => {
    dom.empty(elem);
    elem.appendChild(head);

    const body = dom.div('body');

    try {
      const latestStr = await get('https://api.github.com/repos/catdad/raw-viewer/releases/latest');
      const latest = JSON.parse(latestStr.toString());

      if (semver.gt(latest.tag_name, appVersion)) {
        body.appendChild(dom.p(`There is an update to Raw Viewer ${latest.tag_name}`));
      } else {
        body.appendChild(dom.p('You are already using the latest version of Raw Viewer.'));
      }
    } catch (e) {
      log.error(e);
      body.appendChild(dom.p('Something went wrong when checking for an update.'));
      body.appendChild(dom.p('Please check again later.'));
    }

    elem.appendChild(body);
    elem.appendChild(foot);

    events.emit('modal', { content: elem });
  });

  return { style };
};
