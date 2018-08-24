const log = require('../../tools/log.js')('filmstrip-nav');
const keys = require('../tools/keyboard.js');

const SELECTED = 'selected';

function findSelected(wrapper) {
  for (let elem of [].slice.call(wrapper.children)) {
    if (elem.classList.contains(SELECTED)) {
      return elem;
    }
  }
}

function isInView(containerBB, elBB) {
  return (!(
    elBB.top >= containerBB.bottom ||
    elBB.left >= containerBB.right ||
    elBB.bottom <= containerBB.top ||
    elBB.right <= containerBB.left
  ));
}

module.exports = function ({ wrapper, displayImage }) {
  // display visible images
  async function loadVisible() {
    const wrapperBox = wrapper.getBoundingClientRect();

    await Promise.all([].slice.call(wrapper.querySelectorAll('.thumbnail')).filter(wrap => {
      return wrap.load && isInView(wrapperBox, wrap.getBoundingClientRect());
    }).map(wrap => wrap.load()));
  }

  // handle scrolling
  wrapper.addEventListener('mousewheel', function (ev) {
    wrapper.scrollLeft -= ev.wheelDeltaY;
    ev.preventDefault();
  });

  wrapper.addEventListener('scroll', () => {
    loadVisible().catch(err => {
      log.error('failed to load visible thumbnails', err);
    });
  });

  // handle keyboard navigation
  keys.on('change', () => {
    const isLeft = keys.includes(keys.LEFT);
    const isRight = keys.includes(keys.RIGHT);

    if (!(isLeft || isRight)) {
      return;
    }

    const selected = findSelected(wrapper);

    if (!selected) {
      return;
    }

    const target = isLeft ? selected.previousSibling : selected.nextSibling;

    if (!target) {
      return;
    }

    displayImage(target);
  });

  return {
    loadVisible
  };
};
