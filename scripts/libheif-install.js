const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);
const path = require('path');
const fs = require('fs-extra');
const fetch = require('node-fetch');

const { libheif, libheifDir } = require('../lib/third-party.js');

const version = '0.0.0-nightly.20191126';

const base = `https://github.com/catdad-experiments/libheif-emscripten/releases/download/${version}`;
const lib = `${base}/libheif.js`;
const license = `${base}/LICENSE`;

const responseStream = async url => {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`failed response: ${res.status} ${res.statusText}`);
  }

  return res.body;
};

require('./lib.run.js')(`libheif v${version}`, async () => {
  await fs.ensureDir(libheifDir);

  await pipeline(await responseStream(lib), fs.createWriteStream(libheif));
  await pipeline(await responseStream(license), fs.createWriteStream(path.resolve(libheifDir, 'LICENSE')));
});
