const fs = require('fs-extra');
const ipc = require('electron').ipcRenderer;

const log = require('../tools/log.js')('exiftool-child');
const dcraw = require('./dcraw.js')(2);

const ROTATION = {
  'Horizontal (normal)': 0,
  'Rotate 90 CW': 90,
  'Rotate 270 CW': 270
};

function gid() {
  return Math.random().toString(36).substr(2);
}

function readExif(filepath) {
  const id = gid() + gid();

  return new Promise((resolve, reject) => {
    ipc.once(`exiftool:callback:${id}`, (ev, data) => {
      if (data.ok) {
        return resolve(data.value);
      }

      return reject(new Error(data.err));
    });

    ipc.send('exiftool:read:metadata', { filepath, id });
  });
}

function readJpeg(filepath) {
  const id = gid() + gid();

  return new Promise((resolve, reject) => {
    const ondata = async ({ orientation, start, length }) => {
      let buffer;

      if (start && length) {
        // we can get a fast jpeg image
        log.time(`read jpeg ${filepath}`);

        buffer = Buffer.alloc(length);
        const fd = await fs.open(filepath, 'r');
        await fs.read(fd, buffer, 0, length, start);

        log.timeEnd(`read jpeg ${filepath}`);
      } else {
        log.time(`read dcraw ${filepath}`);
        // we should fall back to dcraw - e.g. Canon 30D
        buffer = Buffer.from(await dcraw.exec('imageUint8Array', [filepath]));
        log.timeEnd(`read dcraw ${filepath}`);
      }

      resolve({
        orientation,
        buffer,
        rotation: ROTATION[orientation] || 0
      });
    };

    ipc.once(`exiftool:callback:${id}`, (ev, data) => {
      if (data.ok) {
        return ondata(data.value);
      }

      return reject(new Error(data.err));
    });

    ipc.send('exiftool:read:jpegmeta', { filepath, id });
  });
}

module.exports = {
  readExif,
  readJpeg
};
