const name = 'filmstrip';
const style = true;

const log = require('../../lib/log.js')(name);
const dom = require('../tools/dom.js');
const dragDrop = require('../tools/ipc-draganddrop.js');
const readMetaAndDataUrl = require('./read-image.js');
const navigation = require('./navigation.js');
const rating = require('./rating.js');
const { findSelected, SELECTED, SELECTED_SECONDARY } = require('./selection-helpers.js');

function isClippedLeft(containerBB, elBB) {
  return elBB.left < containerBB.left;
}

function isClippedRight(containerBB, elBB) {
  return elBB.right > containerBB.right;
}

function isClippedTop(containerBB, elBB) {
  return elBB.top < containerBB.top;
}

function isClippedBottom(containerBB, elBB) {
  return elBB.bottom > containerBB.bottom;
}

function isClipped(containerBB, elBB) {
  return isClippedLeft(containerBB, elBB) ||
    isClippedRight(containerBB, elBB) ||
    isClippedTop(containerBB, elBB) ||
    isClippedBottom(containerBB, elBB);
}

module.exports = ({ events }, opts) => {
  const direction = opts.experiments.filmstripOnLeft ? 'vertical' : 'horizontal';

  const elem = dom.div(name);
  const wrapper = dom.div(`${name}-wrapper`);

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
      `reading meta and full image ${filepath}`,
      async () => await readMetaAndDataUrl({ filepath, meta, type: 'full' })
    );

    // do DOM reads before we update anything
    const parentBB = wrapper.getBoundingClientRect();
    const thumbBB = thumb.getBoundingClientRect();

    [].slice.call(wrapper.children).forEach(elem => {
      elem.classList.remove(SELECTED);
      elem.classList.remove(SELECTED_SECONDARY);
    });

    thumb.classList.add(SELECTED);

    events.emit('image:load', {
      filepath: filepath,
      imageUrl: url,
      rotation: rotation
    });

    if (isClipped(parentBB, thumbBB)) {
      thumb.scrollIntoView({
        inline: 'center', // horizontal alignment
        block: 'center' // vertical alignment
      });
    }
  }

  function ctrlSelect(thumb) {
    thumb.classList.toggle(SELECTED_SECONDARY);
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
        child.classList.add(SELECTED_SECONDARY);
      } else {
        child.classList.remove(SELECTED_SECONDARY);
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

  function createThumbnail() {
    const imgWrap = dom.div('thumbnail');
    const img = dom.elem('img');

    imgWrap.appendChild(img);

    return { imgWrap, img };
  }

  const { resolveVisible, navigateTo } = navigation({ wrapper, displayImage, direction, events });

  async function loadThumbnails({ files }) {
    wrapper.innerHTML = '';

    const fragment = document.createDocumentFragment();

    for (let { file, filepath, type } of files) {
      let { imgWrap, img } = createThumbnail();

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

    wrapper.appendChild(fragment);

    // render the first image as soon as we have it
    try {
      await navigateTo(wrapper.firstChild);
    } catch (e) {
      events.emit('error', new Error('failed to load initial image'));
    }
  }

  events.on('window:resize', () => {
    resolveVisible();
  });

  events.on('directory:discover', ({ files }) => {
    log.timing('load thumbs', async () => await loadThumbnails({ files }));
  });

  return { elem, style };
};
