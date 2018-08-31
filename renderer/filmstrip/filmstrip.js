const fs = require('fs-extra');
const path = require('path');

const name = 'filmstrip';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

const log = require('../../tools/log.js')(name);
const readMetaAndDataUrl = require('./read-image.js');
const navigation = require('./navigation.js');
const rating = require('./rating.js');

function isClippedLeft(containerBB, elBB) {
  return elBB.left < containerBB.left;
}

function isClippedRight(containerBB, elBB) {
  return elBB.right > containerBB.right;
}

module.exports = function ({ events }) {
  const elem = document.createElement('div');
  elem.className = name;

  const wrapper = document.createElement('div');
  wrapper.className = `${name}-wrapper`;

  elem.appendChild(wrapper);

  let leastRating = 0;

  function applyRating(thumb) {
    const isVisible = thumb.style.display !== 'none';
    const shouldBeVisible = thumb.x_rating === undefined || thumb.x_rating >= leastRating;

    if (isVisible && !shouldBeVisible) {
      thumb.style.display = 'none';
      return true;
    }

    if (!isVisible && shouldBeVisible) {
      thumb.style.display = 'flex';
      return true;
    }

    return false;
  }

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
    thumb.x_rating = meta.rating || 0;

    thumb.addEventListener('click', () => {
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

  const { loadVisible } = navigation({ wrapper, displayImage, events });

  function applyFilters() {
    let changed = false;

    const thumbs = [].slice.call(wrapper.children);

    thumbs.forEach((thumb) => {
      const didChange = applyRating(thumb);
      changed = changed || didChange;
    });

    return changed;
  }

  async function resolveVisible() {
    await loadVisible();

    const changed = applyFilters();

    if (changed) {
      await resolveVisible();
    }
  }

  async function loadThumbnails(dir) {
    log.time('load thumbs');

    const files = (await fs.readdir(dir)).sort((a, b) => a.localeCompare(b));

    wrapper.innerHTML = '';

    const fragment = document.createDocumentFragment();

    for (let file of files) {
      let filepath = path.resolve(dir, file);
      let { imgWrap, img } = thumbnail();

      let setMeta = (meta) => {
        imgWrap.x_meta = Object.assign(imgWrap.x_meta, meta);
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

        imgWrap.appendChild(rating({ filepath, meta, events, setMeta }));

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

  events.on('image:filter', ({ rating }) => {
    if (rating === leastRating) {
      return;
    }

    leastRating = rating;

    resolveVisible().catch(err => {
      events.emit('error', err);
    });
  });

  events.on('load:directory', function ({ dir }) {
    loadThumbnails(dir);
  });

  return { elem, style };
};
