const fs = require('fs');
const path = require('path');

const name = 'dropzone';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

module.exports = function ({ events }) {
  var elem = document.createElement('div');
  elem.className = name;

  function stop() {
    return false;
  }

  elem.ondragover = stop;
  elem.ondragleave = stop;
  elem.ondragend = stop;

  elem.ondrop = (e) => {
    e.preventDefault();

    const dir = e.dataTransfer.files[0];

    if (dir) {
      events.emit('load:directory', { dir: dir.path });
      events.emit('config:directory', { value: dir.path });
    }

    return false;
  };

  events.on('load:directory', () => {
    elem.style.display = 'none';
  });

  return { elem, style };
};
