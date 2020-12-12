const { promisify } = require('util');
const path = require('path');
const zlib = require('zlib');

const fs = require('fs-extra');
const root = require('rootrequire');

const svgAppIcon = require('svg-app-icon');

const NAME = path.resolve(root, 'assets/icon.svgz');

const dist = file => path.resolve(root, 'dist', file);

const unzip = async name => promisify(zlib.unzip)(await fs.readFile(name));

function compress() {
  // this one is only used manually... otherwise some
  // errors need to be handled here
  fs.createReadStream('./assets/icon-1000.svg')
    .pipe(zlib.createGzip({ level: 9 }))
    .pipe(fs.createWriteStream(NAME));
}

module.exports = {
  compress,
  render: async () => {
    const svg = await unzip(NAME);

    await svgAppIcon(svg, {
      destination: path.resolve(root, 'icons')
    });
  },
  path: (() => {
    if (process.platform === 'win32') {
      return dist('icon.ico');
    }

    if (process.platform === 'darwin') {
      return dist('icon.icns');
    }
  })()
};
