/* eslint-disable no-console */
const path = require('path');

const fs = require('fs-extra');
const fetch = require('node-fetch');
const FormData = require('form-data');

const throwResErr = (res, body) => {
  throw new Error(`upload failed with ${res.status} ${res.statusText} and body:\n${body}`);
};

const fetchOk = async (...args) => {
  const res = await fetch(...args);

  const txt = await res.text();

  if (!res.ok) {
    throwResErr(res, txt);
  }

  return txt;
};

const expiresOn = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

// 10GB limit, one download only
const fileIo = async (filepath, name = null) => {
  const url = 'https://file.io';
  const filename = name || path.basename(filepath);
  console.log(`Uploading ${filepath} to ${url}`);

  const form = new FormData();
  form.append('file', fs.createReadStream(filepath), { filename });

  const txt = await fetchOk(url, {
    method: 'POST',
    headers: form.getHeaders(),
    body: form
  });

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
  const txt = await fetchOk(url, {
    method: 'PUT',
    body: fs.createReadStream(filepath)
  });

  return {
    url: txt.trim()
  };
};

// 2GM limit?, flaky af
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

// 32 MB limit
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

// 200MB limit
const wsend = async (filepath, name = null) => {
  // based on:
  // https://raw.githubusercontent.com/abemassry/wsend/master/wsend
  // https://github.com/abemassry/node-wsend/blob/master/wsend.js

  const filename = name || path.basename(filepath);
  const host = 'https://wsend.net';

  const id = await fetchOk(`${host}/createunreg`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: 'start=1'
  });

  const form = new FormData();
  form.append('uid', id.trim());
  form.append('filehandle', fs.createReadStream(filepath), { filename });

  const url = await fetchOk(`${host}/upload_cli`, {
    method: 'POST',
    headers: form.getHeaders(),
    body: form
  });

  return {
    filename,
    url,
    expiry: '30 days',
    expires: expiresOn(30)
  };
};

// 512MB limit
const oxo = async (filepath, name = null) => {
  const filename = name || path.basename(filepath);
  const url = 'https://0x0.st/';
  console.log(`Uploading ${filepath} to ${url}`);

  const form = new FormData();
  form.append('file', fs.createReadStream(filepath), {
    filename: filename,
    contentType: null
  });

  // form-data uses stream1, and it does not write proper
  // chunks, so it doesn't seem to work with 0x0
  // so read everything into a buffer for now
  const body = await new Promise((resolve, reject) => {
    try {
      const body = [];
      form.on('data', chunk => body.push(Buffer.from(chunk)));
      form.on('end', () => resolve(Buffer.concat(body)));
      form.on('error', err => reject(err));
      form.resume();
    } catch (e) {
      reject(e);
    }
  });

  const txt = await fetchOk(url, {
    method: 'POST',
    headers: form.getHeaders(),
    body
  });

  return {
    filename: filename,
    url: txt.trim(),
    expiry: '30 days',
    expires: expiresOn(30)
  };
};

module.exports = { fileIo, transferSh, filePush, wsend, oxo };
