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

module.exports = {
  findSelected,
  findNextTarget,
  show, hide, ok
};
