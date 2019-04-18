const div = (className) => {
  const el = document.createElement('div');
  el.className = className;

  return el;
};

const empty = (elem) => {
  while (elem.firstChild) {
    elem.removeChild(elem.firstChild);
  }
};

module.exports = {
  div,
  empty
};
