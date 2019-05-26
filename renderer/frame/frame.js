const { BrowserWindow } = require('electron').remote;

const name = 'frame';
const style = true;
const log = require('../../lib/log.js')(name);

const dom = require('../tools/dom.js');

module.exports = ({ events }) => {
  const close = dom.icon('close');
  const maximize = dom.icon('flip_to_front');
  const minimize = dom.icon('minimize');

  close.addEventListener('click', () => {
    BrowserWindow.getFocusedWindow().close();
  });

  maximize.addEventListener('click', () => {
    const browser = BrowserWindow.getFocusedWindow();

    if (browser.isMaximized()) {
      browser.unmaximize();
    } else {
      browser.maximize();
    }
  });

  minimize.addEventListener('click', () => {
    BrowserWindow.getFocusedWindow().minimize();
  });

  const elem = dom.children(
    dom.div(name),
    close,
    maximize,
    minimize,
  );

  return { elem, style };
};
