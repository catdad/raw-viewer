const log = require('../../lib/log.js')('filmstrip-nav');
const keys = require('../tools/keyboard.js');

const SELECTED = 'selected';

function show(thumb) {
  thumb.style.display = 'flex';
}

function hide(thumb) {
  thumb.style.display = 'none';
}

function ok(thumb) {
  return thumb.style.display !== 'none';
}

function findSelected(wrapper) {
  for (let elem of [].slice.call(wrapper.children)) {
    if (elem.classList.contains(SELECTED)) {
      return elem;
    }
  }
}

function findNextTarget(wrapper, direction) {
  const next = direction === 'left' ? 'previousSibling' : 'nextSibling';

  let selected = findSelected(wrapper);

  while (selected && selected[next]) {
    selected = selected[next];

    if (selected && ok(selected)) {
      return selected;
    }
  }

  return null;
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

  return function addToQueue(time = 0) {
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

const filter = {
  rating: (expected, actual) => {
    if (actual === undefined) {
      return true; // ??? not sure.. the code was like this at one point
    }

    return actual >= expected;
  },
  type: (expected, actual) => {
    if (expected === '*') {
      return true;
    }

    return expected === actual;
  }
};

module.exports = function ({ wrapper, displayImage, events }) {
  let expectRating = 0;

  function applyRating(thumb) {
    const isVisible = ok(thumb);
    const shouldBeVisible = filter.rating(expectRating, thumb.x_rating);

    if (isVisible && !shouldBeVisible) {
      hide(thumb);
      return true;
    }

    if (!isVisible && shouldBeVisible) {
      show(thumb);
      return true;
    }

    return false;
  }

  function applyFilters() {
    let changed = false;

    const thumbs = [].slice.call(wrapper.children);

    thumbs.forEach((thumb) => {
      const didChange = applyRating(thumb);
      changed = changed || didChange;
    });

    return changed;
  }

  // display visible images
  const resolveVisible = throttle(async function self() {
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

    // apply any filters
    const changed = applyFilters();

    if (changed) {
      await self();
    }
  });

  // handle scrolling
  wrapper.addEventListener('mousewheel', function (ev) {
    wrapper.scrollLeft -= ev.wheelDeltaY;
    ev.preventDefault();
  });

  wrapper.addEventListener('scroll', () => {
    resolveVisible(200).catch(err => {
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

    const target = findNextTarget(wrapper, isLeft ? 'left' : 'right');

    if (!target) {
      return;
    }

    displayImage(target);
  });

  events.on('image:filter', ({ rating }) => {
    if (rating === expectRating) {
      return;
    }

    expectRating = rating;

    resolveVisible().catch(err => {
      events.emit('error', err);
    });
  });

  return {
    resolveVisible
  };
};
