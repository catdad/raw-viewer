const { promisify } = require('util');
const path = require('path');
const zlib = require('zlib');
const fs = require('fs');
const root = require('rootrequire');
const { createCanvas, loadImage } = require('canvas');
const pngToIco = require('png-to-ico');
const icnsConvert = require('@fiahfy/icns-convert');

const name = path.resolve(root, 'assets/icon.svgz');

const read = promisify(fs.readFile);
const write = promisify(fs.writeFile);

const unzip = async name => promisify(zlib.unzip)(await read(name));

function compress() {
  // this one is only used manually... otherwise some
  // errors need to be handled here
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

async function createIco(svg) {
  return await pngToIco(await render(svg, 256));
}

async function createIcns(svg) {
  return await icnsConvert([
    await render(svg, 16),
    await render(svg, 32),
    await render(svg, 64),
    await render(svg, 128),
    await render(svg, 256),
    await render(svg, 512),
    await render(svg, 1024)
  ]);
}

async function prepare() {
  const svg = await unzip(name);
  await write(path.resolve(root, 'dist/icon.svg'), svg);

  const png = await render(svg, 512);
  await write(path.resolve(root, 'dist/icon.png'), png);

  const ico = await createIco(svg);
  await write(path.resolve(root, 'dist/icon.ico'), ico);

  const icns = await createIcns(svg);
  await write(path.resolve(root, 'dist/icon.icns'), icns);
}

module.exports = {
  compress,
  prepare
};
