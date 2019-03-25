const { expect } = require('chai');

const { start, stop, waitForVisible } = require('./app-provider.js');
const config = require('./config-provider.js');

describe('[smoke tests]', () => {
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

  it('opens to the drag and drop screen', async () => {
    const configPath = config.create({});
    const app = await start(configPath);

    await waitForVisible('.dropzone');

    expect(await app.client.getText('.dropzone .container')).to.equal('drag and drop a folder to view');
  });
});
