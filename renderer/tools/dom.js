const div = (className) => {
  const el = document.createElement('div');
  el.className = className;

  return el;
};

const text = (str) => document.createTextNode(str);

const h1 = (str) => {
  const el = document.createElement('h1');
  el.appendChild(text(str));

  return el;
};

const empty = (elem) => {
  while (elem.firstChild) {
    elem.removeChild(elem.firstChild);
  }
};

module.exports = {
  div,
  text,
  h1,
  empty
};
