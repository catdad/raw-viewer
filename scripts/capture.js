/* eslint-disable no-console */
const path = require('path');
const { promisify } = require('util');
const { execFile } = require('child_process');

const root = require('rootrequire');
const fs = require('fs-extra');
const fetch = require('node-fetch');
const FormData = require('form-data');

const config = require('../test/lib/config-provider.js');
const app = require('../test/lib/app-provider.js');

const upload = async (filepath) => {
  const url = 'https://file.io';
  const filename = path.basename(filepath);

  console.log(`Uploading ${filepath} to ${url}`);

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filepath), {
      filename: filename
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: form.getHeaders(),
      body: form
    });

    const txt = await res.text();

    try {
      const json = JSON.parse(txt);

      if (json.success) {
        console.table(json);
      } else {
        throw new Error('not successful');
      }
    } catch (e) {
      console.log(`upload failed with ${res.statusCode} and body:`);
      console.log(txt);
    }
  } catch (e) {
    console.log('upload failed with error:');
    console.log(e);
  }
};

(async () => {
  const configPath = await config.create({
    client: {
      lastDirectory: path.resolve(root, 'temp')
    }
  });

  await app.start(configPath);
  await app.waitForElementCount('.filmstrip .thumbnail', 1);

  await promisify(execFile)('screenshot', ['-x', 'screen.jpg'], {
    cwd: path.resolve(root)
  });

  await upload(path.resolve(root, 'screen.jpg'));
})().then(() => {
  console.log('capture finished');
}).catch(err => {
  console.log('capture failed');
  console.log(err);
  process.exitCode = 1;
});
