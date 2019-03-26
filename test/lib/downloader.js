/* eslint-disable no-console */

const path = require('path');

const root = require('rootrequire');
const fs = require('fs-extra');
const fetch = require('node-fetch');

const fixture = name => path.resolve(root, 'temp', name);
const drive = id => `http://drive.google.com/uc?export=view&id=${id}`;

const images = {
  '0001.jpg': drive('1Mdlwd9i4i4HuVJjEcelUj6b0OAYkQHEj')
};

(async () => {
  for (let name in images) {
    const url = images[name];
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`failed to download ${name} at ${url}`);
    }

    const file = await res.buffer();
    await fs.outputFile(fixture(name), file);
  }
})().then(() => {
  console.log('done downloading images');
}).catch(err => {
  console.error(err);
  process.exitCode = 1;
});
