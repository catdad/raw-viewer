const fs = require('fs-extra');

const name = 'dropzone';
const style = true;

const dom = require('../tools/dom.js');

function dropzoneContent() {
  return dom.children(
    dom.div('container'),
    dom.children(
      dom.div('text'),
      dom.p('drag a folder to open'),
      dom.classname(dom.p('or click to select a folder'), 'small')
    )
  );
}

module.exports = ({ events }) => {
  const elem = dom.div(name);
  let hasDir = false;

  dom.children(elem, dropzoneContent());

  function open() {
    elem.style.display = 'flex';
  }

  function close() {
    elem.style.display = 'none';
  }

  async function handleOpen(dirpath) {
    try {
      const stat = await fs.stat(dirpath);

      if (!stat.isDirectory()) {
        return events.emit('error', new Error('try opening a folder instead of a file'));
      }

      events.emit('directory:load', { dir: dirpath });
    } catch(e) {
      return events.emit('error', e);
    }
  }

  function stop() {
    return false;
  }

  elem.onclick = (ev) => {
    ev.preventDefault();
    events.emit('directory:open');
  };

  elem.ondragover = stop;
  elem.ondragend = stop;

  elem.ondragleave = () => {
    if (hasDir) {
      close();
    }

    return false;
  };

  elem.ondrop = (e) => {
    e.preventDefault();

    const dir = e.dataTransfer.files[0];

    if (dir) {
      handleOpen(dir.path);
      close();
    }

    return false;
  };

  window.addEventListener('dragenter', (ev) => {
    ev.preventDefault();
    open();
    return false;
  });

  events.on('directory:load', () => {
    hasDir = true;
    close();
  });

  return { elem, style };
};
