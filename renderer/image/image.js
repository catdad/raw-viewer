const fs = require('fs');
const path = require('path');

const dcraw = require('dcraw');

let style = fs.readFileSync(path.resolve(__dirname, 'image.css'), 'utf8');

module.exports = function ({ events }) {
  var elem = document.createElement('div');
  elem.className = 'image';

  function loadImage(filepath) {
    console.time('read');
    const file = fs.readFileSync(filepath);
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

    elem.innerHTML = '';
    elem.appendChild(img);
  }

  events.on('load:image', function ({ filepath }) {
    loadImage(filepath);
  });

  return { elem, style };
};
