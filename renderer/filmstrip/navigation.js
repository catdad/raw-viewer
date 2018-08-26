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

function sleep(time = 100) {
  return new Promise(resolve => setTimeout(resolve, time));
}

module.exports = function ({ wrapper, displayImage, events }) {
  let loading = false;
  let queueLoading = false;

  // display visible images
  async function loadVisible(throttle = 0) {
    if (loading) {
      queueLoading = true;
      return;
    }

    loading = true;

    // throttle if requested, like when executing on
    // a scroll event
    await sleep(throttle);

    const wrapperBox = wrapper.getBoundingClientRect();

    const states = [].slice.call(wrapper.querySelectorAll('.thumbnail')).map(child => {
      return {
        child,
        visible: isInView(wrapperBox, child.getBoundingClientRect())
      };
    });

    // load all visible thumbnails
    await Promise.all(states
      .filter(({ child, visible }) => visible && child.load)
      .map(({ child }) => child.load())
    );

    // unload all out-of-view thumbnails
    await Promise.all(states
      .filter(({ visible }) => !visible)
      .map(({ child }) => child.unload())
    );

    loading = false;

    if (queueLoading) {
      queueLoading = false;

      await loadVisible();
    }
  }

  // handle scrolling
  wrapper.addEventListener('mousewheel', function (ev) {
    wrapper.scrollLeft -= ev.wheelDeltaY;
    ev.preventDefault();
  });

  wrapper.addEventListener('scroll', () => {
    loadVisible(200).catch(err => {
      log.error('failed to load visible thumbnails', err);
      events.emit('error', err);
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
