/* eslint-disable no-console */
const path = require('path');
const { promisify } = require('util');
const { execFile } = require('child_process');

const root = require('rootrequire');
const fs = require('fs-extra');

const config = require('../test/lib/config-provider.js');
const app = require('../test/lib/app-provider.js');
const { transferSh: upload } = require('./lib.upload.js');

const exec = async (cmd, args, opts) => {
  return await promisify(execFile)(cmd, args, opts);
};

const darwinDarkMode = async () => {
  // "not dark mode" makes this script a toggle...
  // you can also use true/false to set exact value
  await exec('osascript', ['-e', 'tell app "System Events" to tell appearance preferences to set dark mode to not dark mode']);
};

const sleep = ms => new Promise(resolve => setTimeout(() => resolve(), ms));

(async () => {
  try {
    const configPath = await config.create({
      client: {
        lastDirectory: path.resolve(root, 'temp')
      },
      experiments: {
        framelessWindow: true
      }
    });

    await app.start(configPath);
    await app.waitForElementCount('.filmstrip .thumbnail', 1);

    await Promise.all([
      await sleep(1000),
      await darwinDarkMode()
    ]);

    await exec('screencapture', ['-x', 'screen.jpg'], {
      cwd: path.resolve(root)
    });

    console.table(await upload(path.resolve(root, 'screen.jpg')));
  } catch (e) {
    throw e;
  } finally {
    await config.cleanAll();
    await app.stop(true);
    await fs.remove(path.resolve(root, 'screen.jpg'));
  }
})().then(() => {
  console.log('capture finished');
}).catch(err => {
  console.log('capture failed');
  console.log(err);
  process.exitCode = 1;
});
