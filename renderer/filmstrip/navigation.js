const trash = require('trash');
const throttle = require('p-throttle');

const log = require('../../lib/log.js')('filmstrip-nav');
const keys = require('../tools/keyboard.js');
const noOverlap = require('../tools/promise-overlap.js')();
const { findSelected, findNextTarget, show, hide, ok } = require('./selection-helpers.js');

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

module.exports = ({ wrapper, displayImage, direction, events }) => {
  let expectRating = { from: 0, to: 5 };
  let expectType = '*';

  function getAllThumbnails() {
    return [].slice.call(wrapper.querySelectorAll('.thumbnail'));
  }

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
    const thumbnails = getAllThumbnails();

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
      // between iterations of this function, like when scrolling
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

  const deleteSelected = noOverlap(async () => {
    const selected = findSelected(wrapper, true);
    const target = findNextTarget(wrapper, 'right', true, true);

    await trash(selected.map(elem => elem.x_filepath));
    selected.forEach(elem => wrapper.removeChild(elem));

    return { target };
  });

  const navigateTo = noOverlap(async (target) => {
    if (!target) {
      // no target is loading, unload current image
      const thumbnails = getAllThumbnails();
      events.emit('image:unload', { hasFilteredImages: !!thumbnails.length });
      return;
    }

    await displayImage(target);
    await resolveVisible();
  });

  if (direction === 'horizontal') {
    // translate vertical scrolling to horizontal
    wrapper.addEventListener('mousewheel', (ev) => {
      wrapper.scrollLeft -= ev.wheelDeltaY;
      ev.preventDefault();
    });
  }

  wrapper.addEventListener('scroll', () => {
    resolveVisible().catch(err => {
      log.error('failed to load visible thumbnails', err);
      events.emit('error', err);
    });
  });

  // handle keyboard navigation
  keys.on('change', () => {
    const isPrev = keys.includes(keys.LEFT) || keys.includes(keys.UP);
    const isNext = keys.includes(keys.RIGHT) || keys.includes(keys.DOWN);
    const isDelete = keys.includes(keys.DELETE) || keys.includes(keys.BACKSPACE);

    Promise.resolve()
      .then(() => {
        if (isDelete) {
          return deleteSelected()
            .then(({ target }) => navigateTo(target));
        }

        if (isPrev || isNext) {
          const target = findNextTarget(wrapper, isPrev ? 'left' : 'right');

          if (target) {
            return navigateTo(target);
          }
        }
      })
      .catch((err) => {
        events.emit('error', err);
      });
  });

  events.on('image:filter', ({ rating, type }) => {
    if (rating === expectRating && type === expectType) {
      return;
    }

    expectRating = rating === undefined ? expectRating : rating;
    expectType = type === undefined ? expectType : type;

    resolveVisible().then(() => {
      // find selected thumbnail
      let selected = findSelected(wrapper, false);
      let isVisible = !!selected;

      if (selected) {
        isVisible = ok(selected);
      }

      if (isVisible) {
        return navigateTo(selected);
      }

      // the currently selected thumbnail is filtred out,
      // so find the first available one and select it
      const next = findNextTarget(wrapper, 'right', true, true);
      navigateTo(next);
    }).catch(err => {
      events.emit('error', err);
    });
  });

  return {
    resolveVisible,
    navigateTo,
  };
};
