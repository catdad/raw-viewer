const { expect } = require('chai');

const {
  start, stop,
  waitForVisible, waitForElementCount,
  elementAttribute
} = require('./lib/app-provider.js');
const config = require('./lib/config-provider.js');
const { names, path: fixturePath } = require('./lib/fixtures.js');

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

  async function cleanup() {
    const includeLogs = this.currentTest.state === 'failed';

    await all(
      stop(includeLogs),
      config.cleanAll()
    );
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('opens to the drag and drop screen', async () => {
    const configPath = await config.create({});
    const app = await start(configPath);

    await waitForVisible('.dropzone');

    expect(await app.client.getText('.dropzone .container'))
      .to.equal('drag a folder to open\nor click to select a folder');
  });

  it('loads fixture images', async () => {
    expect(names.length).to.be.above(0);

    const configPath = await config.create({
      client: {
        lastDirectory: fixturePath()
      }
    });
    await start(configPath);

    const elements = await waitForElementCount('.filmstrip .thumbnail', names.length);

    for (let i in names) {
      const name = names[i];
      const element = elements[i];

      const filename = await elementAttribute(element, 'data-filename');
      expect(filename).to.equal(name);
    }
  });
});
