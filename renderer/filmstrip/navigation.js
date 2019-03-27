const trash = require('trash');
const throttle = require('p-throttle');

const log = require('../../lib/log.js')('filmstrip-nav');
const keys = require('../tools/keyboard.js');

const SELECTED = 'selected';
const SELECTED_SECONDARY = 'selected-secondary';

function show(thumb) {
  thumb.style.display = 'flex';
}

function hide(thumb) {
  thumb.style.display = 'none';
}

function ok(thumb) {
  return thumb.style.display !== 'none';
}

function findSelected(wrapper, includeSecondary = false) {
  const result = [];
  let selected, secondary;

  for (let elem of [].slice.call(wrapper.children)) {
    secondary = elem.classList.contains(SELECTED_SECONDARY);
    selected = elem.classList.contains(SELECTED);

    if (selected && !includeSecondary) {
      return elem;
    }

    if (selected || secondary) {
      result.push(elem);
    }
  }

  return result;
}

function findNextTarget(wrapper, direction, includeSelected = false) {
  const next = direction === 'left' ? 'previousSibling' : 'nextSibling';

  const mainSelected = findSelected(wrapper);
  const allSelected = includeSelected ?
    findSelected(wrapper, true) :
    [mainSelected];

  let target = mainSelected;

  while (target && target[next]) {
    target = target[next];

    if (target && ok(target) && !allSelected.includes(target)) {
      return target;
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

const filter = {
  rating: (expected, actual) => {
    if (actual === undefined) {
      // thumbs that haven't loaded yet won't have a value set
      return true;
    }

    return actual >= expected.from && actual <= expected.to;
  },
  type: (expected, actual) => {
    if (actual === undefined) {
      return true;
    }

    if (expected === '*') {
      return true;
    }

    return expected === actual;
  }
};

module.exports = function ({ wrapper, displayImage, events }) {
  let expectRating = { from: 0, to: 5 };
  let expectType = '*';

  function applyFilter(thumb) {
    const isVisible = ok(thumb);
    const shouldBeVisible = filter.rating(expectRating, thumb.x_rating) &&
      filter.type(expectType, thumb.x_type);

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
      const didChange = applyFilter(thumb);
      changed = changed || didChange;
    });

    return changed;
  }

  // display visible images
  const resolveVisible = throttle(async function self() {
    const thumbnails = [].slice.call(wrapper.querySelectorAll('.thumbnail'));

    async function findImageToLoad(wrapperBox) {
      for (let thumb of thumbnails) {
        thumb.x_isInView = isInView(wrapperBox, thumb.getBoundingClientRect());

        if (thumb.x_isInView && thumb.load) {
          return thumb;
        }
      }

      return null;
    }

    async function recurseThumbnails() {
      // find visible area each time, as this may change
      // between iterations of this function
      const wrapperBox = wrapper.getBoundingClientRect();

      // load the first image we find that needs to be loaded
      const thumb = await findImageToLoad(wrapperBox);

      if (thumb) {
        await thumb.load();
        // repeat loading first image
        await recurseThumbnails();
      }
    }

    await recurseThumbnails();

    // unload all out-of-view thumbnails from last iteration
    await Promise.all(thumbnails
      .filter(({ x_isInView }) => !x_isInView)
      .map(thumb => thumb.unload())
    );

    // apply any filters
    const changed = applyFilters();

    if (changed) {
      await self();
    }
  }, 1, 200);

  async function deleteSelected() {
    const selected = findSelected(wrapper, true);
    const target = findNextTarget(wrapper, 'right', true);

    await trash(selected.map(elem => elem.x_filepath));
    selected.forEach(elem => wrapper.removeChild(elem));

    return { target };
  }

  function navigateTo(target) {
    if (!target) {
      return;
    }

    displayImage(target);

    resolveVisible();
  }

  // handle scrolling
  wrapper.addEventListener('mousewheel', function (ev) {
    wrapper.scrollLeft -= ev.wheelDeltaY;
    ev.preventDefault();
  });

  wrapper.addEventListener('scroll', () => {
    resolveVisible().catch(err => {
      log.error('failed to load visible thumbnails', err);
      events.emit('error', err);
    });
  });

  // handle keyboard navigation
  keys.on('change', () => {
    const isLeft = keys.includes(keys.LEFT);
    const isRight = keys.includes(keys.RIGHT);
    const isDelete = keys.includes(keys.DELETE);

    if (isDelete) {
      deleteSelected()
        .then(({ target }) => {
          navigateTo(target);
        })
        .catch((err) => {
          events.emit('error', err);
        });

      return;
    }

    if (isLeft || isRight) {
      navigateTo(findNextTarget(wrapper, isLeft ? 'left' : 'right'));
    }
  });

  events.on('image:filter', ({ rating, type }) => {
    if (rating === expectRating && type === expectType) {
      return;
    }

    expectRating = rating === undefined ? expectRating : rating;
    expectType = type === undefined ? expectType : type;

    resolveVisible().catch(err => {
      events.emit('error', err);
    });
  });

  return {
    resolveVisible
  };
};
