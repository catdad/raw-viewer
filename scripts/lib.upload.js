/* eslint-disable no-console */
const path = require('path');

const fs = require('fs-extra');
const fetch = require('node-fetch');
const FormData = require('form-data');

const throwResErr = (res, body) => {
  throw new Error(`upload failed with ${res.status} ${res.statusText} and body:\n${body}`);
};

const expiresOn = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

// https://0x0.st/
// should work with form data, same as file.io
// but it returns 400 Bad Request every time

const fileIo = async (filepath, name = null) => {
  const url = 'https://file.io';
  const filename = name || path.basename(filepath);
  console.log(`Uploading ${filepath} to ${url}`);

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

  if (!res.ok) {
    throwResErr(res, txt);
  }

  const json = JSON.parse(txt);

  if (!json.success) {
    throw new Error('not successful');
  }

  return {
    filename: filename,
    url: json.link,
    expiry: json.expiry,
    expires: expiresOn(14)
  };
};

const putFile = async (url, filepath) => {

  const res = await fetch(url, {
    method: 'PUT',
    body: fs.createReadStream(filepath)
  });

  const txt = await res.text();

  if (!res.ok) {
    throwResErr(res, txt);
  }

  return {
    url: txt.trim()
  };
};

const transferSh = async (filepath, name = null) => {
  const filename = name || path.basename(filepath);
  const url = `https://transfer.sh/${filename}`;

  const res = await putFile(url, filepath);

  return Object.assign({}, res, {
    filename,
    expiry: '14 days',
    expires: expiresOn(14)
  });
};

const filePush = async (filepath, name = null) => {
  const filename = name || path.basename(filepath);
  const url = `https://filepush.co/upload/${filename}`;

  const res = await putFile(url, filepath);

  return Object.assign({}, res, {
    filename,
    expiry: '7 days',
    expires: expiresOn(7)
  });
};

module.exports = { fileIo, transferSh, filePush };
