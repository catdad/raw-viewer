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

async function readExif(filepath) {
  log.time('exif');

  await initExiftool();

  const data = exifTool.readMetadata(filepath, ['-File:all']);

  log.timeEnd('exif');

  return data;
}

module.exports = function init(receive, send) {
  receive('exiftool:read', async (ev, { filepath, id }) => {
    log.info('read exif for', filepath, id);

    let data;
    const cbName = `exiftool:callback:${id}`;

    try {
      data = await readExif(filepath);
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
