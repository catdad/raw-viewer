const { shell } = require('electron');

const div = (className) => {
  const el = document.createElement('div');

  if (className) {
    el.className = className;
  }

  return el;
};

const text = (str) => document.createTextNode(str);

const p = (str) => {
  const el = document.createElement('p');

  if (str !== undefined) {
    el.appendChild(text(str));
  }

  return el;
};

const span = (str) => {
  const el = document.createElement('span');

  if (str !== undefined) {
    el.appendChild(text(str));
  }

  return el;
};

const h1 = (str) => {
  const el = document.createElement('h1');
  el.appendChild(text(str));

  return el;
};

const link = (str, href) => {
  const a = document.createElement('a');
  a.href = href;
  a.appendChild(text(str));

  a.onclick = (ev) => {
    ev.preventDefault();
    shell.openExternal(href);
  };

  return a;
};

const linkBlock = (className, str, href) => {
  const el = div(className);
  el.appendChild(link(str, href));
  return el;
};

const classname = (el, className) => {
  el.className = className;
  return el;
};

const children = (el, ...childs) => {
  for (let child of childs) {
    el.appendChild(child);
  }

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
  p,
  span,
  h1,
  link,
  linkBlock,
  classname,
  children,
  empty
};
