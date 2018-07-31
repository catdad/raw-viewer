const fs = require('fs-extra');
const path = require('path');

const { imageUrl } = require('../util.js');

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

  function handleDisplay(thumb) {
    thumb.addEventListener('click', function () {
      events.emit('load:image', {
        filepath: thumb.getAttribute('data-filepath'),
        imageUrl: thumb['data-imageurl']
      });
    });
  }

  async function loadThumbnails(dir) {
    var files = await fs.readdir(dir);

    wrapper.innerHTML = '';

    for (let file of files) {
      let filepath = path.resolve(dir, file);
      let thumb = document.createElement('div');
      thumb.className = 'thumbnail';
      thumb.setAttribute('data-filename', file);
      thumb.setAttribute('data-filepath', filepath);
      thumb['data-imageurl'] = await imageUrl(filepath);

      thumb.style.backgroundImage = `url("${thumb['data-imageurl']}")`;

      handleDisplay(thumb);

      wrapper.appendChild(thumb);
    }
  }

  events.on('load:directory', function ({ dir }) {
    loadThumbnails(dir);
  });

  return { elem, style };
};
