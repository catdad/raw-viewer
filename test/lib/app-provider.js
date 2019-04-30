const path = require('path');

const { Application } = require('spectron');
const electronPath = require('electron');

let app;

const sleep = time => new Promise(resolve => setTimeout(() => resolve(), time));

const log = (...args) => console.log(...args); // eslint-disable-line no-console

const start = async (configPath = '') => {
  app = new Application({
    path: electronPath,
    args: ['.'],
    env: {
      'RAW_VIEWER_CONFIG_PATH': configPath
    },
    cwd: path.resolve(__dirname, '../..'),
    waitTimeout: 5000
  });

  await app.start();

  return app;
};

const stop = async () => {
  if (app && app.isRunning()) {
    try {
      const mainLogs = await app.client.getMainProcessLogs();
      log(mainLogs);
      const clientLogs = await app.client.getRenderProcessLogs();
      log(clientLogs);
    } catch (e) {
      log(e);
    }

    await app.stop();
    app = null;
  }
};

const ensureApp = (func) => (...args) => {
  if (!(app && app.isRunning())) {
    throw new Error('the application is not running');
  }

  return func(...args);
};

const wrapWebdriver = (name) => ensureApp((...args) => app.client[name](...args));

const waitForElementCount = ensureApp(async (selector, count) => {
  let elements;

  await app.client.waitUntil(async () => {
    const { value } = await app.client.elements(selector);
    elements = value;
    return elements.length === count;
  });

  return elements;
});

const elementAttribute = ensureApp(async (element, attribute) => {
  const { value } = await app.client.elementIdAttribute(element.ELEMENT, attribute);
  return value;
});

module.exports = {
  start,
  stop,
  waitUntil: wrapWebdriver('waitUntil'),
  waitForVisible: wrapWebdriver('waitForVisible'),
  waitForElementCount,
  elementAttribute,
  sleep
};
