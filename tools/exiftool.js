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
    done = true;

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
  log.time(`exif ${filepath}`);

  await initExiftool();

  const data = await exifTool.readMetadata(filepath, ['-File:all']);

  log.timeEnd(`exif ${filepath}`);

  return data;
}

async function readJpegMeta(filepath) {
  await initExiftool();

  log.time(`jpeg ${filepath}`);

  const data = await exifTool.readMetadata(filepath, [
    'Orientation',
    'JpgFromRawLength',
    'JpgFromRawStart',
    'PreviewImageLength',
    'PreviewImageStart'
  ]);

  const {
    JpgFromRawLength,
    JpgFromRawStart,
    PreviewImageLength,
    PreviewImageStart,
    Orientation
  } = data.data[0];

  const start = JpgFromRawStart || PreviewImageStart;
  const length = JpgFromRawLength || PreviewImageLength;

  log.timeEnd(`jpeg ${filepath}`);

  return { orientation: Orientation, start, length };
}

module.exports = function init(receive, send) {
  function createCallback(id) {
    const cbName = `exiftool:callback:${id}`;

    return function (err, data) {
      if (err) {
        return send(cbName, {
          ok: false,
          err: err.message
        });
      }

      return send(cbName, {
        ok: true,
        value: data
      });
    };
  }

  receive('exiftool:read:metadata', async (ev, { filepath, id }) => {
    let data, size;
    const callback = createCallback(id);

    try {
      [ data, size ] = await Promise.all([
        readExif(filepath),
        fileSize(filepath)
      ]);

      // use incorrect (format-wise) tag names, to hopefully make it clear
      // these are not property exif or maker tags
      _.set(data, 'data[0].Z-FileBytes', size);
      _.set(data, 'data[0].Z-FileSize', prettyBytes(size));
    } catch (e) {
      log.error(e);
      return callback(e);
    }

    return callback(null, data);
  });

  receive('exiftool:read:jpegmeta', async (ev, { filepath, id }) => {
    let data;
    const callback = createCallback(id);

    try {
      data = await readJpegMeta(filepath);
    } catch (e) {
      log.error(e);
      return callback(e);
    }

    return callback(null, data);
  });
};
