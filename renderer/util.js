const fs = require('fs');

const dcraw = require('dcraw');

function imageElem(filepath) {
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

  return img;
}

module.exports = {
  imageElem
};
