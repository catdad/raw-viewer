/* global postMessage */

const fs = require('fs-extra');
const decode = require('heic-decode');

const raw = async (filepath) => {
  const buffer = await fs.readFile(filepath);
  const { width, height, data } = await decode({ buffer });
  return { width, height, data };
};

// eslint-disable-next-line no-undef
onmessage = ({ data }) => {
  raw(data.filepath).then(({ data, width, height }) => {
    postMessage({ type: 'done', epoch: Date.now(), data, width, height }, [data]);
  }).catch(err => {
    postMessage({ type: 'done', epoch: Date.now(), error: err });
  });
};

postMessage({ type: 'ready', epoch: Date.now() });
