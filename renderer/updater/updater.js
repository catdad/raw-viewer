const semver = require('semver');
const fetch = require('node-fetch');
const { shell } = require('electron');

const name = 'updater';
const style = true;
const log = require('../../lib/log.js')(name);
const analytics = require('../../lib/analytics.js');
const icon = require('../../lib/icon.js')();
const { appName, appVersion } = require('../../lib/is.js');

const dom = require('../tools/dom.js');

const get = async (url) => {
  const res = await fetch(url, {
    headers: { 'user-agent': `Raw-Viewer-v${appVersion}` }
  });

  if (!res.ok) {
    throw new Error(`unexpected response: ${res.status} ${res.statusText}`);
  }

  return await res.json();
};

/*
 * > semver.gt('1.1.1-beta3', '1.1.1-beta10')
 * true
 * > semver.gt('1.1.1-beta.3', '1.1.1-beta.10')
 * false
 */
const cleanVersion = str => {
  const { major, minor, patch, prerelease: [pre] } = semver.parse(str);
  let clean = `${major}.${minor}.${patch}`;

  if (pre) {
    clean += `-${pre.replace(/([0-9]+)/, '.$1')}`;
  }

  return clean;
};

const getUpdateStatus = async () => {
  const result = { updateAvailable: false };
  const status = await get('https://api.github.com/repos/catdad/raw-viewer/releases/latest');
  const current = cleanVersion(appVersion);
  const latest = cleanVersion(status.tag_name);
  const hasUpdate = semver.gt(latest, current);

  if (hasUpdate) {
    result.updateAvailable = true;
    result.tagName = status.tag_name;
    result.url = status.html_url;
  }

  return result;
};

const notifyForUpdate = async () => {
  const result = await getUpdateStatus();
  if (result.updateAvailable) {
    log.info(`an update to version ${result.tagName} is available`);

    new Notification(`Version ${result.tagName} available`, {
      body: `${appName} has a new update, download it by clicking on this notification`,
      icon,
      silent: true
    }).onclick = () => {
      shell.openExternal(result.url);
    };
  } else {
    log.info('already running latest version');
  }
};

module.exports = ({ events }) => {
  const elem = dom.div(name);
  const head = dom.div('head');
  const foot = dom.div('foot');

  const title = dom.h1(`${appName} v${appVersion}`);
  head.appendChild(title);

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

  async function checkForUpdate() {
    dom.empty(elem);
    elem.appendChild(head);

    const body = dom.div('body');

    try {
      const status = await getUpdateStatus();

      const icon = dom.div('icon');
      body.appendChild(icon);

      if (status.updateAvailable) {
        icon.appendChild(dom.text('🎁'));
        body.appendChild(dom.p(`There is an update to Raw Viewer ${status.tagName}`));
        body.appendChild(dom.link('Download', status.url));
      } else {
        icon.appendChild(dom.text('🚀'));
        body.appendChild(dom.p('You are already using the latest version of Raw Viewer.'));
      }
    } catch (e) {
      log.error(e);
      body.appendChild(dom.p('Something went wrong when checking for an update.'));
      body.appendChild(dom.p('Please check again later.'));
    }

    body.appendChild(dom.link('Visit the website', 'https://github.com/catdad/raw-viewer'));

    elem.appendChild(body);
    elem.appendChild(foot);

    events.emit('modal', { content: elem });
  }

  events.on('check-for-update', () => {
    analytics.screenview('update');
    checkForUpdate().then(() => {
      log.info('succeded checking for updates');
    }).catch(err => {
      log.error('check for update error', err);
      events.emit('error', new Error('failed to check for updates'));
    });
  });

  notifyForUpdate().catch(err => {
    log.error('failed to get initial update status', err);
  });

  return { style };
};
