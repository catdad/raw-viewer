const path = require('path');

const { Application } = require('spectron');
const electronPath = require('electron');

const config = require('./config-provider.js');

describe('[smoke tests]', () => {
  let app;

  const start = async (configPath = '') => {
    app = new Application({
      path: electronPath,
      args: ['.'],
      env: {
        'RAW_VIEWER_CONFIG_PATH': configPath
      },
      cwd: path.resolve(__dirname, '..')
    });

    await app.start();
  };

  const stop = async () => {
    if (app && app.isRunning()) {
      await app.stop();
      app = null;
    }
  };

  beforeEach(async () => {
    await stop();
    await config.cleanAll();
  });

  afterEach(async () => {
    await stop();
    await config.cleanAll();
  });

  it('waits', async () => {
    const configPath = config.create({});
    await start(configPath);

    await new Promise(resolve => setTimeout(resolve, 1000));
  });
});
