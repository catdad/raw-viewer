const path = require('path');

const { Application } = require('spectron');
const electronPath = require('electron');

let app;

const sleep = time => new Promise(resolve => setTimeout(() => resolve(), time));

const log = (...args) => console.log(...args); // eslint-disable-line no-console

const args = process.env.UNSAFE_CI ?
  ['--no-sandbox', '--disable-setuid-sandbox', '.'] :
  ['.'];

const start = async (configPath = '') => {
  app = new Application({
    path: electronPath,
    args: args,
    env: {
      'RAW_VIEWER_CONFIG_PATH': configPath
    },
    cwd: path.resolve(__dirname, '../..'),
    waitTimeout: 5000
  });

  await app.start();

  await app.client.waitUntilWindowLoaded();

  return app;
};

const printLogs = async () => {
  log('\n---- start failure logs ----\n');

  try {
    const mainLogs = await app.client.getMainProcessLogs();
    log(mainLogs);
    const clientLogs = await app.client.getRenderProcessLogs();
    log(clientLogs);
  } catch (e) {
    log(e);
  }

  log('\n---- end failure logs ----\n');
};

const stop = async (logs) => {
  if (app && app.isRunning()) {
    if (logs) {
      await printLogs();
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

const waitForThrowable = ensureApp(async (func) => {
  let result, error;

  try {
    await app.client.waitUntil(async () => {
      try {
        result = await func();
      } catch (e) {
        error = e;
        return false;
      }

      error = null;
      return true;
    });
  } catch (e) {
    throw error || e;
  }

  return result;
});

const waitForElementCount = ensureApp(async (selector, count) => {
  let elements;

  await app.client.waitUntil(async () => {
    elements = await app.client.$$(selector);
    return elements.length === count;
  }, 1000, `did not find ${count} of element "${selector}"`);

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
  waitForThrowable,
  waitForElementCount,
  elementAttribute,
  sleep
};
