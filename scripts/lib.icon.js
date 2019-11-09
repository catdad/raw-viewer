const { promisify } = require('util');
const path = require('path');
const zlib = require('zlib');
const fs = require('fs');
const root = require('rootrequire');
const { createCanvas, loadImage } = require('canvas');
const pngToIco = require('png-to-ico');

const name = path.resolve(root, 'assets/icon.svgz');

const read = promisify(fs.readFile);
const write = promisify(fs.writeFile);

const unzip = async name => promisify(zlib.unzip)(await read(name));

function compress() {
  fs.createReadStream('./assets/icon-1000.svg')
    .pipe(zlib.createGzip({ level: 9 }))
    .pipe(fs.createWriteStream(name));
}

async function render(svg, size) {
  const img = await loadImage(svg);
  const canvas = createCanvas(size, size);
  canvas.getContext('2d').drawImage(img, 0, 0);

  return await canvas.toBuffer('image/png');
}

async function createIco(png) {
  return await pngToIco(png);
}

async function prepare() {
  const svgBuffer = await unzip(name);
  await write(path.resolve(root, 'dist/icon.svg'), svgBuffer);

  const png = await render(svgBuffer, 512);
  await write(path.resolve(root, 'dist/icon.png'), png);

  const ico = await createIco(png);
  await write(path.resolve(root, 'dist/icon.ico'), ico);
}

module.exports = {
  compress,
  prepare
};
