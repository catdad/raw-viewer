const fs = require('fs-extra');
const path = require('path');

const name = 'filmstrip';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

const log = require('../../lib/log.js')(name);
const dragDrop = require('../tools/ipc-draganddrop.js');
const readMetaAndDataUrl = require('./read-image.js');
const navigation = require('./navigation.js');
const rating = require('./rating.js');
const { findSelected } = require('./selection-helpers.js');

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

  function onError(err, msg = '') {
    log.error('handled error:', err);
    events.emit('error', msg || err);
  }

  async function displayImage(thumb) {
    if (thumb.load) {
      await thumb.load();
    }

    const filepath = thumb.x_filepath;
    const meta = thumb.x_meta;

    const { url, rotation } = await log.timing(
      `new data ${filepath}`,
      async () => await readMetaAndDataUrl({ filepath, meta, type: 'full' })
    );

    // do DOM reads before we update anything
    const parentBB = wrapper.getBoundingClientRect();
    const thumbBB = thumb.getBoundingClientRect();

    [].slice.call(wrapper.children).forEach(elem => {
      elem.classList.remove('selected');
      elem.classList.remove('selected-secondary');
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

  function ctrlSelect(thumb) {
    thumb.classList.toggle('selected-secondary');
  }

  function shiftSelect(thumb) {
    const children = [].slice.call(wrapper.children);
    const selected = findSelected(wrapper) || children[0];

    if (!selected) {
      return;
    }

    const selectedIdx = children.indexOf(selected);
    const clickedIdx = children.indexOf(thumb);
    const lower = Math.min(selectedIdx, clickedIdx);
    const higher = Math.max(selectedIdx, clickedIdx);

    children.forEach((child, idx) => {
      if (child === selected) {
        return;
      }

      if (idx >= lower && idx <= higher) {
        child.classList.add('selected-secondary');
      } else {
        child.classList.remove('selected-secondary');
      }
    });
  }

  function handleDisplay(thumb, { filepath, file }) {
    thumb.addEventListener('click', (ev = {}) => {
      if (ev.ctrlKey) {
        return ctrlSelect(thumb);
      }

      if (ev.shiftKey) {
        return shiftSelect(thumb);
      }

      displayImage(thumb).catch(err => {
        onError(err, `failed to load ${file}`);
      });
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
    wrapper.innerHTML = '';

    const fragment = document.createDocumentFragment();

    for (let { file, filepath, type } of files) {
      let { imgWrap, img } = thumbnail();

      imgWrap.setAttribute('data-filename', file);
      imgWrap.x_filepath = filepath;
      imgWrap.x_meta = {};
      imgWrap.x_type = type;

      let setMeta = (meta) => {
        imgWrap.x_meta = Object.assign(imgWrap.x_meta, meta);
        imgWrap.x_rating = meta.rating;
      };

      let reload = async () => {
        imgWrap.load = null;

        let { url, rotation, meta } = await log.timing(
          `render ${file}`,
          async () => await readMetaAndDataUrl({ filepath, type: 'thumb' })
        );

        img.classList.add(`rotate-${rotation}`);
        img.src = url;

        return { url, rotation, meta };
      };

      let load = async () => {
        imgWrap.load = null;

        try {
          let { meta } = await reload();

          if (!meta.disabled) {
            imgWrap.appendChild(rating({ filepath, meta, events, setMeta }));
          }

          setMeta(meta);

          handleDisplay(imgWrap, {
            filepath, file, type, meta
          });
        } catch (e) {
          onError(e, `failed to load ${file}`);
          img.src = '';
        }

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
  }

  events.on('directory:discover', function ({ files }) {
    log.timing('load thumbs', async () => await loadThumbnails({ files }));
  });

  return { elem, style };
};
