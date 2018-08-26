const fs = require('fs');
const path = require('path');

const name = 'dropzone';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

function dropzoneContent() {
  const container = document.createElement('div');
  container.className = 'container';

  const text = document.createElement('div');
  text.className = 'text';

  text.appendChild(document.createTextNode('drag and drop a folder to view'));
  container.appendChild(text);

  return container;
}

module.exports = function ({ events }) {
  var elem = document.createElement('div');
  elem.className = name;
  let hasDir = false;

  elem.appendChild(dropzoneContent());

  function stop() {
    return false;
  }

  elem.ondragover = stop.bind('enter');
  elem.ondragend = stop.bind('end');

  elem.ondragleave = () => {
    if (hasDir) {
      elem.style.display = 'none';
    }

    return false;
  };

  elem.ondrop = (e) => {
    e.preventDefault();

    const dir = e.dataTransfer.files[0];

    if (dir) {
      events.emit('load:directory', { dir: dir.path });
      events.emit('config:directory', { value: dir.path });
    }

    return false;
  };

  window.addEventListener('dragenter', (ev) => {
    ev.preventDefault();
    elem.style.display = 'flex';
  });

  events.on('load:directory', () => {
    hasDir = true;
    elem.style.display = 'none';
  });

  return { elem, style };
};
