const fs = require('fs-extra');
const path = require('path');

const log = require('../../tools/log.js')('filmstrip');
const { bufferToUrl } = require('../util.js');
const exiftool = require('../exiftool-child.js');

const name = 'filmstrip';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

module.exports = function ({ events }) {
  var elem = document.createElement('div');
  elem.className = name;

  var wrapper = document.createElement('div');
  wrapper.className = `${name}-wrapper`;

  elem.appendChild(wrapper);

  wrapper.addEventListener('mousewheel', function (ev) {
    wrapper.scrollLeft -= ev.wheelDeltaY;
    ev.preventDefault();
  });

  function handleDisplay(thumb, dataUrl, { filepath, rotation }) {
    thumb.addEventListener('click', function () {
      events.emit('load:image', {
        filepath: filepath,
        imageUrl: dataUrl,
        rotation: rotation
      });

      events.emit('load:meta', {
        filepath: filepath
      });
    });
  }

  function thumbnail({ file, filepath }) {
    const wrapper = document.createElement('div');
    wrapper.className = 'thumbnail';
    wrapper.setAttribute('data-filename', file);
    wrapper.setAttribute('data-filepath', filepath);

    const img = document.createElement('img');

    wrapper.appendChild(img);

    return { wrapper, img };
  }

  async function loadThumbnails(dir) {
    log.time('load thumbs');

    var files = await fs.readdir(dir);

    wrapper.innerHTML = '';

    const fragment = document.createDocumentFragment();
    const promises = [];

    for (let file of files) {
      let filepath = path.resolve(dir, file);
      let { wrapper, img } = thumbnail({ file, filepath });

      promises.push((async () => {
        log.time(`render ${file}`);
        let { buffer, rotation } = await exiftool.readJpeg(filepath);
        let data = bufferToUrl(buffer);
        log.timeEnd(`render ${file}`);

        img.classList.add(`rotate-${rotation}`);
        img.src = data;

        handleDisplay(wrapper, data, {
          filepath, file, rotation
        });

        return wrapper;
      })());

      fragment.appendChild(wrapper);
    }

    wrapper.appendChild(fragment);

    // render the first image as soon as we have it
    promises[0].then((thumb) => {
      thumb.click();
    });

    await Promise.all(promises);

    log.timeEnd('load thumbs');
  }

  events.on('load:directory', function ({ dir }) {
    loadThumbnails(dir);
  });

  return { elem, style };
};
