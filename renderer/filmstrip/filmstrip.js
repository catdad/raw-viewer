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

async function readMetaAndDataUrl({ filepath, type = 'full', meta = null }) {
  const ext = path.extname(filepath.toLowerCase());

  if (meta === null) {
    meta = await exiftool.readShortMeta(filepath);
  }

  if (['.jpeg', '.jpg', '.png'].includes(ext)) {
    return {
      url: filepath,
      orientation: meta.orientation,
      rotation: meta.rotation,
      meta: meta
    };
  }

  let buffer = type === 'full' ?
    await exiftool.readJpegFromMeta(meta) :
    await exiftool.readThumbFromMeta(meta);

  return {
    url: bufferToUrl(buffer),
    orientation: meta.orientation,
    rotation: meta.rotation,
    meta: meta
  };
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

  async function displayImage(thumb) {
    const meta = thumb.x_meta;
    const filepath = thumb.x_filepath;

    log.time(`new data ${filepath}`);
    const { url, rotation } = await readMetaAndDataUrl({ filepath, meta, type: 'full' });
    log.timeEnd(`new data ${filepath}`);

    // do DOM reads before we update anything
    const parentBB = wrapper.getBoundingClientRect();
    const thumbBB = thumb.getBoundingClientRect();

    [].slice.call(wrapper.children).forEach(elem => {
      elem.classList.remove('selected');
    });

    thumb.classList.add('selected');

    events.emit('load:image', {
      filepath: filepath,
      imageUrl: url,
      rotation: rotation
    });

    if (isClippedRight(parentBB, thumbBB)) {
      wrapper.scrollLeft += (parentBB.width / 2) + (thumbBB.width / 2);
    } else if (isClippedLeft(parentBB, thumbBB)) {
      wrapper.scrollLeft -= (parentBB.width / 2) + (thumbBB.width / 2);
    }
  }

  function handleDisplay(thumb, { filepath, file, meta }) {
    thumb.setAttribute('data-filename', file);
    thumb.x_filepath = filepath;
    thumb.x_meta = meta;

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
        let { url, rotation, meta } = await readMetaAndDataUrl({ filepath });
        log.timeEnd(`render ${file}`);

        img.classList.add(`rotate-${rotation}`);
        img.src = url;

        handleDisplay(imgWrap, {
          filepath, file, meta
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
