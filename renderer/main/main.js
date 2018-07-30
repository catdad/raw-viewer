const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

const events = new EventEmitter();

let style = fs.readFileSync(path.resolve(__dirname, 'main.css'), 'utf8');

function applyStyle(css) {
  var elem = document.createElement('style');
  elem.type = 'text/css';

  elem.appendChild(document.createTextNode(css))
  document.head.appendChild(elem);
}

function render(name) {
  const mod = require(path.resolve(__dirname, '..', name, `${name}.js`))({ events });

  applyStyle(mod.style);

  return mod.elem;
}

module.exports = function (elem) {
  applyStyle(style);

  const filmstrip = render('filmstrip');
  const image = render('image');
  const dropzone = render('dropzone');

  elem.appendChild(filmstrip);
  elem.appendChild(image);
  elem.appendChild(dropzone);
};
