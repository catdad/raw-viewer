const path = require('path');
const root = require('rootrequire');

const resolve = (name = '') => path.resolve(root, 'temp', name);
const drive = id => `http://drive.google.com/uc?export=view&id=${id}`;

const images = [{
  name: '0001.jpg',
  url: drive('1Mdlwd9i4i4HuVJjEcelUj6b0OAYkQHEj'),
  hash: /^dhEaot2020g$/
}, {
  name: '0002.gpr',
  url: drive('1Siv7Ez8vhPXPb0YY1CkQnZTKaSYoJuLy'),
  hash: /^ccW0oQU[NP]NxM$/
  // gpr tools for mac differ slightly but images still look fine
}, {
  name: '0003.dng',
  url: drive('17rnPIW4nk8DQnEFpXc2X_HdVodhholWX'),
  hash: /^(anasB32a1aE|anasB32b1aF|anasB32a1aF|amasB32a1aF)$/
  // difference between sharp and canvas
}, {
  name: '0004.webp',
  url: drive('1X5FS1YspuSkWxaM1zkZE7X2qVWWMdKui'),
  hash: /^(awAQ20y52Eg|awCQ20y52Eg)$/
  // difference between sharp and canvas
}];

module.exports = {
  images,
  path: () => resolve(),
  file: name => resolve(name)
};
