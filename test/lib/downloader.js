/* eslint-disable no-console */

const fs = require('fs-extra');
const fetch = require('node-fetch');

const { images, file } = require('./fixtures.js');

require('../../scripts/lib.run.js')('images', async () => {
  for (let name in images) {
    const url = images[name];
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`failed to download ${name} at ${url}`);
    }

    const buffer = await res.buffer();
    await fs.outputFile(file(name), buffer);
  }
});
