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

function render(name, parentElem) {
  const mod = require(path.resolve(__dirname, '..', name, `${name}.js`))({ events });

  if (mod.style) {
    applyStyle(mod.style);
  }

  if (mod.elem) {
    parentElem.appendChild(mod.elem);
  }
}

module.exports = function (elem) {
  applyStyle(style);

  elem.classList.add(name);

  render('directory', elem);
  render('filmstrip', elem);
  render('sidebar', elem);
  render('controls', elem);
  render('image', elem);
  render('dropzone', elem);
  render('toast', elem);

  events.on('config', function (data) {
    if (data.key === 'client.lastDirectory' && data.value) {
      events.emit('directory:load', { dir: data.value });
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
      title: 'App Error:',
      text: err.toString()
    });
  });
};
