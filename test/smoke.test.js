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

  const all = async (...promises) => {
    let err;

    await Promise.all(promises.map(p => p.catch(e => {
      err = e;
    })));

    if (err) {
      throw err;
    }
  };

  const cleanup = async () => {
    await all(
      stop(),
      config.cleanAll()
    );
  };

  beforeEach(cleanup);
  afterEach(cleanup);

  it('waits', async () => {
    const configPath = config.create({});
    await start(configPath);

    await new Promise(resolve => setTimeout(resolve, 1000));
  });
});
