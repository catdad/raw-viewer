const path = require('path');

const { Application } = require('spectron');
const electronPath = require('electron');

let app;

const start = async (configPath = '') => {
  app = new Application({
    path: electronPath,
    args: ['.'],
    env: {
      'RAW_VIEWER_CONFIG_PATH': configPath
    },
    cwd: path.resolve(__dirname, '..'),
    waitTimeout: 5000
  });

  await app.start();

  return app;
};

const stop = async () => {
  if (app && app.isRunning()) {
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

module.exports = {
  start,
  stop,
  waitUntil: wrapWebdriver('waitUntil'),
  waitForVisible: wrapWebdriver('waitForVisible')
};
