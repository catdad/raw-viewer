const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);
const path = require('path');
const fs = require('fs-extra');
const fetch = require('node-fetch');
const unzipper = require('unzipper');
const tar = require('tar');

const { exiftoolDir, platform } = require('../lib/third-party.js');

const version = '12.10';

const urls = {
  win: `https://github.com/catdad-experiments/exiftool-release/releases/download/all/exiftool-${version}.zip`,
  linux: `https://github.com/catdad-experiments/exiftool-release/releases/download/all/Image-ExifTool-${version}.tar.gz`
};

const responseStream = async url => {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`failed response: ${res.status} ${res.statusText}`);
  }

  return res.body;
};

const unzip = async (stream, outdir) => {
  let error;

  await pipeline(stream, unzipper.Parse().on('entry', entry => {
    const name = entry.path;

    if (name !== 'exiftool(-k).exe') {
      return entry.autodrain();
    }

    pipeline(entry, fs.createWriteStream(path.resolve(outdir, 'exiftool.exe')))
      .then(() => {})
      .catch(err => { error = err; });
  }));

  if (error) {
    throw error;
  }
};

const untar = async (stream, outdir) => {
  await pipeline(stream, tar.extract({
    cwd: outdir,
    strip: 1,
    preserveOwner: false,
    filter: path => {
      if (path.indexOf(`Image-ExifTool-${version}/exiftool`) === 0) {
        return true;
      }

      if (path.indexOf(`Image-ExifTool-${version}/lib`) === 0) {
        return true;
      }

      return false;
    }
  }));
};

require('./lib.run.js')(`exiftool v${version}`, async () => {
  await fs.ensureDir(exiftoolDir);

  const archive = await responseStream(urls[platform]);

  if (platform === 'win') {
    await unzip(archive, exiftoolDir);
  } else {
    await untar(archive, exiftoolDir);
  }
});
