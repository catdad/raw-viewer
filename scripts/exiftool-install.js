/* eslint-disable no-console */

const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);
const path = require('path');
const fs = require('fs-extra');
const fetch = require('node-fetch');
const unzip = require('unzipper');
const tar = require('tar');

const { exiftoolDir, platform } = require('../lib/third-party.js');

const version = '11.74';

const urls = {
  win: `http://downloads.sourceforge.net/project/exiftool/exiftool-${version}.zip`,
  linux: `https://downloads.sourceforge.net/project/exiftool/Image-ExifTool-${version}.tar.gz`
};

const responseStream = async url => {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`failed response: ${res.status} ${res.statusText}`);
  }

  return res.body;
};

const unzipPromise = async (stream, outdir) => {
  let error;

  await new Promise((resolve, reject) => {
    pipeline(stream, unzip.Parse().on('entry', entry => {
      const name = entry.path;

      if (name !== 'exiftool(-k).exe') {
        return entry.autodrain();
      }

      pipeline(entry, fs.createWriteStream(path.resolve(outdir, 'exiftool.exe')))
        .then(() => {})
        .catch(err => { error = err; });
    })).then(() => resolve()).catch(err => reject(err));
  });

  if (error) {
    throw error;
  }
};

require('./lib.run.js')(`exiftool v${version}`, async () => {
  await fs.ensureDir(exiftoolDir);

  const archive = await responseStream(urls[platform]);

  if (platform === 'win') {
    await unzipPromise(archive, exiftoolDir);
  } else {
    await pipeline(archive, tar.extract({
      cwd: exiftoolDir,
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
  }
});
