const ipc = require('electron').ipcRenderer;

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

    ipc.send('exiftool:read', { filepath, id });
  });
}

module.exports = {
  readExif
};
