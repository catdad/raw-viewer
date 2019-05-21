/* eslint-disable no-console */
const path = require('path');

const fs = require('fs-extra');
const fetch = require('node-fetch');
const FormData = require('form-data');

const fileIo = async (filepath, name = null) => {
  const url = 'https://file.io';
  const filename = name || path.basename(filepath);
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
      console.log(`upload failed with ${res.status} ${res.statusText} and body:`);
      console.log(txt);
    }
  } catch (e) {
    console.log('upload failed with error:');
    console.log(e);
  }
};

module.exports = { fileIo };
