const path = require('path');
const root = require('rootrequire');

const resolve = (name = '') => path.resolve(root, 'temp', name);
const drive = id => `http://drive.google.com/uc?export=view&id=${id}`;

const images = [{
  name: '0001.jpg',
  url: drive('1Mdlwd9i4i4HuVJjEcelUj6b0OAYkQHEj'),
  hash: 'dhEaot2020g'
}, {
  name: '0002.gpr',
  url: drive('1Siv7Ez8vhPXPb0YY1CkQnZTKaSYoJuLy'),
  hash: 'ccW0oQUNNxM'
}];

module.exports = {
  images,
  path: () => resolve(),
  file: name => resolve(name)
};
