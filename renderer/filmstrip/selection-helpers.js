const SELECTED = 'selected';
const SELECTED_SECONDARY = 'selected-secondary';

function show(thumb) {
  thumb.style.display = 'flex';
}

function hide(thumb) {
  thumb.style.display = 'none';
}

function ok(thumb) {
  return thumb ? thumb.style.display !== 'none' : false;
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

  if (includeSecondary) {
    return result;
  }

  return null;
}

function findNextTarget(wrapper, direction, includeSelected = false, allowFallback = false) {
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

    if (isFallback || !allowFallback) {
      return null;
    }

    return internal(fallback, true);
  }

  return internal(next, false);
}

function findFirst(wrapper) {
  return [].slice.call(wrapper.children)[0];
}

function findLast(wrapper) {
  return [].slice.call(wrapper.children, -1)[0];
}

module.exports = {
  findSelected,
  findNextTarget,
  findFirst,
  findLast,
  show, hide, ok,
  SELECTED, SELECTED_SECONDARY
};
