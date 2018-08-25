const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

const ipc = require('electron').ipcRenderer;

const events = new EventEmitter();

const name = 'main';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

ipc.on('message', function (ev, data) {
  switch (true) {
    case data.type === 'config-read':
      events.emit('config', data);
      break;
  }
});

events.on('ipc:send', function (data) {
  ipc.send('message', data);
});

function applyStyle(css) {
  var elem = document.createElement('style');
  elem.type = 'text/css';

  elem.appendChild(document.createTextNode(css));
  document.head.appendChild(elem);
}

function render(name) {
  const mod = require(path.resolve(__dirname, '..', name, `${name}.js`))({ events });

  applyStyle(mod.style);

  return mod.elem;
}

module.exports = function (elem) {
  applyStyle(style);

  elem.classList.add(name);

  const filmstrip = render('filmstrip');
  const sidebar = render('sidebar');
  const controls = render('controls');
  const image = render('image');
  const dropzone = render('dropzone');
  const toast = render('toast');

  elem.appendChild(filmstrip);
  elem.appendChild(sidebar);
  elem.appendChild(controls);
  elem.appendChild(image);
  elem.appendChild(dropzone);
  elem.appendChild(toast);

  events.on('config', function (data) {
    if (data.key === 'client.lastDirectory' && data.value) {
      events.emit('load:directory', { dir: data.value });
    }
  });

  events.emit('ipc:send', {
    type: 'config-get',
    key: 'client.lastDirectory'
  });

  events.on('config:directory', function (data) {
    events.emit('ipc:send', {
      type: 'config-set',
      key: 'client.lastDirectory',
      value: data.value
    });
  });

  events.on('error', (err) => {
    events.emit('toast:error', {
      title: 'Error',
      text: err.toString()
    });
  });
};
