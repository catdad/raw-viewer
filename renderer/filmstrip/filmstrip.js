const fs = require('fs-extra');
const path = require('path');

const log = require('../../tools/log.js')('filmstrip');
const { bufferToUrl } = require('../util.js');
const exiftool = require('../exiftool-child.js');

const name = 'filmstrip';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

function isInView(containerBB, elBB) {
  return (!(
    elBB.top >= containerBB.bottom ||
    elBB.left >= containerBB.right ||
    elBB.bottom <= containerBB.top ||
    elBB.right <= containerBB.left
  ));
}

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

  wrapper.addEventListener('scroll', () => {
    loadVisible().catch(err => {
      log.error('failed to load visible thumbnails', err);
    });
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
    const imgWrap = document.createElement('div');
    imgWrap.className = 'thumbnail';
    imgWrap.setAttribute('data-filename', file);
    imgWrap.setAttribute('data-filepath', filepath);

    const img = document.createElement('img');

    imgWrap.appendChild(img);

    return { imgWrap, img };
  }

  async function loadVisible() {
    const wrapperBox = wrapper.getBoundingClientRect();

    await Promise.all([].slice.call(wrapper.querySelectorAll('.thumbnail')).filter(wrap => {
      return wrap.load && isInView(wrapperBox, wrap.getBoundingClientRect());
    }).map(wrap => wrap.load()));
  }

  async function loadThumbnails(dir) {
    log.time('load thumbs');

    var files = await fs.readdir(dir);

    wrapper.innerHTML = '';

    const fragment = document.createDocumentFragment();

    for (let file of files) {
      let filepath = path.resolve(dir, file);
      let { imgWrap, img } = thumbnail({ file, filepath });

      imgWrap.load = async () => {
        imgWrap.load = null;

        log.time(`render ${file}`);
        let { buffer, rotation } = await exiftool.readJpeg(filepath);
        let data = bufferToUrl(buffer);
        log.timeEnd(`render ${file}`);

        img.classList.add(`rotate-${rotation}`);
        img.src = data;

        handleDisplay(imgWrap, data, {
          filepath, file, rotation
        });

        return imgWrap;
      };

      fragment.appendChild(imgWrap);
    }

    // render the first image as soon as we have it
    fragment.firstChild.load().then(thumb => thumb.click());

    wrapper.appendChild(fragment);

    await loadVisible();

    log.timeEnd('load thumbs');
  }

  events.on('load:directory', function ({ dir }) {
    loadThumbnails(dir);
  });

  return { elem, style };
};
