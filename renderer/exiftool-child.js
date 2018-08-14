const fs = require('fs-extra');
const ipc = require('electron').ipcRenderer;

const log = require('../tools/log.js')('exiftool-child');

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
      log.time(`read jpeg ${filepath}`);

      const buffer = Buffer.alloc(length);
      const fd = await fs.open(filepath, 'r');
      await fs.read(fd, buffer, 0, length, start);

      log.timeEnd(`read jpeg ${filepath}`);

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
