const path = require('path');
const root = require('rootrequire');

const resolve = (name = '') => path.resolve(root, 'temp', name);
const drive = id => `http://drive.google.com/uc?export=view&id=${id}`;

const images = {
  '0001.jpg': drive('1Mdlwd9i4i4HuVJjEcelUj6b0OAYkQHEj')
};

module.exports = {
  images,
  names: Object.keys(images).sort((a, b) => a.localeCompare(b)),
  path: () => resolve(),
  file: name => resolve(name)
};
