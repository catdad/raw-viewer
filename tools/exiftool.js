const fs = require('fs-extra');
const prettyBytes = require('pretty-bytes');
const _ = require('lodash');

const exifToolLib = require('node-exiftool');
const exifToolBin = require('dist-exiftool');
const exifTool = new exifToolLib.ExiftoolProcess(exifToolBin);

const log = require('./log.js')('exiftool');

const initExiftool = (() => {
  let done = false;
  let prom;

  const initOnce = async () => {
    if (done) {
      return;
    }

    if (prom) {
      await prom;
      return;
    }

    prom = exifTool.open();
    await prom;

    return;
  };

  log.time('exiftool:boot');

  // initalize once on startup
  initOnce().then(() => {
    log.timeEnd('exiftool:boot');
    log.info('exiftool started');
  }).catch(err => {
    log.timeEnd('exiftool:boot');
    log.error('exiftool error');
    log.error(err);
  });

  return initOnce;
})();

async function fileSize(filepath) {
  return (await fs.stat(filepath)).size;
}

async function readExif(filepath) {
  log.time('exif');

  await initExiftool();

  const data = await exifTool.readMetadata(filepath, ['-File:all']);

  log.timeEnd('exif');

  return data;
}

module.exports = function init(receive, send) {
  receive('exiftool:read', async (ev, { filepath, id }) => {
    log.info('read exif for', filepath, id);

    let data, size;
    const cbName = `exiftool:callback:${id}`;

    try {
      [ data, size ] = await Promise.all([
        readExif(filepath),
        fileSize(filepath)
      ]);

      // use incorrect (format-wise) tag names, to hopefully make it clear
      // these are not property exif or maker tags
      _.set(data, 'data[0].Z-FileBytes', size);
      _.set(data, 'data[0].Z-FileSize', prettyBytes(size));
    } catch(e) {
      log.error(e);

      return send(cbName, {
        ok: false,
        err: e.message
      });
    }

    log.info('got exif data');

    send(cbName, {
      ok: true,
      value: data
    });
  });
};
