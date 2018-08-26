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

function throttle(asyncFunc) {
  let isRunning = false;
  let isWaiting = false;
  let isQueued = false;
  let promise;

  async function exec(time) {
    isRunning = true;

    isWaiting = true;
    await sleep(time);
    isWaiting = false;

    let val = await asyncFunc();
    isRunning = false;

    if (isQueued) {
      isQueued = false;
      val = await exec(0);
    }

    return val;
  }

  return function addToQueue(time) {
    // do not queue new executions while in
    // the throttle waiting period
    if (isWaiting) {
      return promise;
    }

    // if running and not waiting, queue
    // another execution to happen at the end
    if (isRunning) {
      isQueued = true;

      return promise;
    }

    // this is the first time this is called,
    // so execute with a throttle
    promise = exec(time).then(data => {
      promise = null;
      return Promise.resolve(data);
    }).catch(err => {
      promise = null;
      return Promise.reject(err);
    });

    return promise;
  };
}

module.exports = function ({ wrapper, displayImage, events }) {
  // display visible images
  const loadVisible = throttle(async function loadVisible() {
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
  });

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
