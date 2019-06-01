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
  const next     = direction === 'left' ? 'previousSibling' : 'nextSibling';
  const fallback = direction === 'left' ? 'nextSibling' : 'previousSibling';

  function internal(sibling, isFallback) {
    const mainSelected = findSelected(wrapper);
    const allSelected = includeSelected ?
      findSelected(wrapper, true) :
      [mainSelected];

    let target = mainSelected;

    while (target && target[sibling]) {
      target = target[sibling];

      if (target && ok(target) && !allSelected.includes(target)) {
        return target;
      }
    }

    if (isFallback) {
      return null;
    }

    return internal(fallback, true);
  }

  return internal(next, false);
}

module.exports = {
  findSelected,
  findNextTarget,
  show, hide, ok,
  SELECTED, SELECTED_SECONDARY
};
