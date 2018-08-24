const fs = require('fs-extra');
const path = require('path');

const name = 'filmstrip';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

const log = require('../../tools/log.js')(name);
const readMetaAndDataUrl = require('./read-image.js');
const navigation = require('./navigation.js');

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

  const { loadVisible } = navigation({ wrapper, displayImage });

  async function loadThumbnails(dir) {
    log.time('load thumbs');

    var files = (await fs.readdir(dir)).sort((a, b) => a.localeCompare(b));

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
