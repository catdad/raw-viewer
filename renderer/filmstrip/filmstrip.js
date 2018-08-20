const fs = require('fs-extra');
const path = require('path');

const log = require('../../tools/log.js')('filmstrip');
const { bufferToUrl } = require('../util.js');
const exiftool = require('../exiftool-child.js');
const keys = require('../tools/keyboard.js');

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

function isClippedLeft(containerBB, elBB) {
  return elBB.left < containerBB.left;
}

function isClippedRight(containerBB, elBB) {
  return elBB.right > containerBB.right;
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

  function findSelected() {
    for (let elem of [].slice.call(wrapper.children)) {
      if (elem.classList.contains('selected')) {
        return elem;
      }
    }
  }

  function displayImage(thumb) {
    const filepath = thumb.x_filepath;
    const data = thumb.x_dataUrl;
    const rotation = thumb.x_rotation;

    // do DOM reads before we update anything
    const parentBB = wrapper.getBoundingClientRect();
    const thumbBB = thumb.getBoundingClientRect();

    [].slice.call(wrapper.children).forEach(elem => {
      elem.classList.remove('selected');
    });

    thumb.classList.add('selected');

    events.emit('load:image', {
      filepath: filepath,
      imageUrl: data,
      rotation: rotation
    });

    events.emit('load:meta', {
      filepath: filepath
    });

    if (isClippedRight(parentBB, thumbBB)) {
      wrapper.scrollLeft += (parentBB.width / 2) + (thumbBB.width / 2);
    } else if (isClippedLeft(parentBB, thumbBB)) {
      wrapper.scrollLeft -= (parentBB.width / 2) + (thumbBB.width / 2);
    }
  }

  function handleDisplay(thumb, { data, filepath, file, rotation }) {
    thumb.setAttribute('data-filename', file);
    thumb.x_file = file;
    thumb.x_filepath = filepath;
    thumb.x_rotation = rotation;
    thumb.x_dataUrl = data;

    thumb.addEventListener('click', function () {
      displayImage(thumb);
    });
  }

  function thumbnail() {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'thumbnail';

    const img = document.createElement('img');

    imgWrap.appendChild(img);

    return { imgWrap, img };
  }

  keys.on('change', () => {
    const isLeft = keys.includes(keys.LEFT);
    const isRight = keys.includes(keys.RIGHT);

    if (!(isLeft || isRight)) {
      return;
    }

    const selected = findSelected();

    if (!selected) {
      return;
    }

    const target = isLeft ? selected.previousSibling : selected.nextSibling;

    if (!target) {
      return;
    }

    displayImage(target);
  });

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
      let { imgWrap, img } = thumbnail();

      imgWrap.load = async () => {
        imgWrap.load = null;

        log.time(`render ${file}`);
        let { buffer, rotation } = await exiftool.readJpeg(filepath);
        let data = bufferToUrl(buffer);
        log.timeEnd(`render ${file}`);

        img.classList.add(`rotate-${rotation}`);
        img.src = data;

        handleDisplay(imgWrap, {
          data, filepath, file, rotation
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
