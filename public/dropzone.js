/* eslint-env browser: true */

console.log('the script loaded');

// TODO move this stuff to the main thread
const fs = require('fs');
const dcraw = require('dcraw');

const dropArea = document.querySelector('#dropzone');
const image = document.querySelector('#image');

function loadImage(path) {
  console.time('read');
  const file = fs.readFileSync(path);
  console.timeEnd('read');

  console.time('meta');
  var meta = dcraw(file, { verbose: true, identify: true });
  console.timeEnd('meta');

  console.log(meta);

  console.time('tiff');
  var tiff = dcraw(file, { extractThumbnail: true });
//  var tiff = dcraw(file, { exportAsTiff: true });
  console.timeEnd('tiff');

  console.log(tiff.length);

  var img = document.createElement('img');
  img.src = 'data:image/jpeg;base64,' + Buffer.from(tiff).toString('base64');

  image.innerHTML = '';
  image.appendChild(img);
}

function stop() {
  return false;
}

dropArea.ondragover = stop;
dropArea.ondragleave = stop;
dropArea.ondragend = stop;

dropArea.ondrop = (e) => {
  e.preventDefault();

  console.log(e);

  for (let f of e.dataTransfer.files) {
    console.log('File(s) you dragged here: ', f.path);

    loadImage(f.path);
  }

  return false;
};
