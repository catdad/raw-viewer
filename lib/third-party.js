const path = require('path');
const root = path.resolve(__dirname, '..');

const platform = process.platform === 'win32' ? 'win' : 'linux';

const exiftoolDir = path.resolve(root, 'third-party/exiftool', platform);
const exiftool = path.resolve(exiftoolDir, `exiftool${platform === 'win' ? '.exe' : ''}`);

module.exports = {
  platform,
  exiftoolDir,
  exiftool
};
