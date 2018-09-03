const fs = require('fs-extra');
const path = require('path');

const name = 'filmstrip';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

const log = require('../../lib/log.js')(name);
const dragDrop = require('../tools/ipc-draganddrop.js');
const readMetaAndDataUrl = require('./read-image.js');
const navigation = require('./navigation.js');
const rating = require('./rating.js');

function isClippedLeft(containerBB, elBB) {
  return elBB.left < containerBB.left;
}

function isClippedRight(containerBB, elBB) {
  return elBB.right > containerBB.right;
}

function isClipped(containerBB, elBB) {
  return isClippedLeft(containerBB, elBB) || isClippedRight(containerBB, elBB);
}

module.exports = function ({ events }) {
  const elem = document.createElement('div');
  elem.className = name;

  const wrapper = document.createElement('div');
  wrapper.className = `${name}-wrapper`;

  elem.appendChild(wrapper);

  async function displayImage(thumb) {
    if (thumb.load) {
      await thumb.load();
    }

    const filepath = thumb.x_filepath;
    const meta = thumb.x_meta;

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

    events.emit('image:load', {
      filepath: filepath,
      imageUrl: url,
      rotation: rotation
    });

    if (isClipped(parentBB, thumbBB)) {
      thumb.scrollIntoView({
        inline: 'center'
      });
    }
  }

  function handleDisplay(thumb, { filepath, file, meta }) {
    thumb.setAttribute('data-filename', file);
    thumb.x_filepath = filepath;
    thumb.x_meta = meta;
    thumb.x_rating = meta.rating || 0;

    thumb.addEventListener('click', () => {
      displayImage(thumb);
    });

    dragDrop(thumb, filepath);
  }

  function thumbnail() {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'thumbnail';

    const img = document.createElement('img');

    imgWrap.appendChild(img);

    return { imgWrap, img };
  }

  const { resolveVisible } = navigation({ wrapper, displayImage, events });

  async function loadThumbnails({ files }) {
    log.time('load thumbs');

    wrapper.innerHTML = '';

    const fragment = document.createDocumentFragment();

    for (let { file, filepath } of files) {
      let { imgWrap, img } = thumbnail();

      let setMeta = (meta) => {
        imgWrap.x_meta = Object.assign(imgWrap.x_meta, meta);
        imgWrap.x_rating = meta.rating;
      };

      let reload = async () => {
        imgWrap.load = null;

        log.time(`render ${file}`);
        let { url, rotation, meta } = await readMetaAndDataUrl({ filepath });
        log.timeEnd(`render ${file}`);

        img.classList.add(`rotate-${rotation}`);
        img.src = url;

        return { url, rotation, meta };
      };

      let load = async () => {
        imgWrap.load = null;

        let { meta } = await reload();

        if (!meta.disabled) {
          imgWrap.appendChild(rating({ filepath, meta, events, setMeta }));
        }

        handleDisplay(imgWrap, {
          filepath, file, meta
        });

        return imgWrap;
      };

      let unload = async () => {
        if (!img.src) {
          return;
        }

        img.src = '';
        imgWrap.load = reload;
      };

      imgWrap.load = load;
      imgWrap.unload = unload;

      fragment.appendChild(imgWrap);
    }

    // render the first image as soon as we have it
    fragment.firstChild.load().then(thumb => thumb.click());

    wrapper.appendChild(fragment);

    await resolveVisible();

    log.timeEnd('load thumbs');
  }

  events.on('directory:discover', function ({ files }) {
    loadThumbnails({ files });
  });

  return { elem, style };
};
