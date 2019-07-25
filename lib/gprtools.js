const path = require('path');
const { promisify } = require('util');
const { execFile } = require('child_process');
const fs = require('fs-extra');
const electron = require('electron');
const app = electron.app || electron.remote.app;

const log = require('./log.js')('gprtools');
const { gprtools } = require('./third-party.js');
const exec = promisify(execFile);

const dir = path.join(app.getPath('temp'), `${app.getName()}-workfiles`);

const name = () => Math.random().toString(36).slice(2);

const jpg = async (filepath) => {
  const tempfile = path.resolve(dir, `${name()}.jpg`);
  log.info(`${filepath} -> ${tempfile}`);

  await fs.ensureDir(dir);
  await exec(gprtools, ['-i', filepath, '-o', tempfile]);
  return await fs.readFile(tempfile);
};

module.exports = { jpg };
