const ipc = require('electron').ipcRenderer;

module.exports = ((elem, filepath) => {
  elem.ondragstart = (ev) => {
    ev.preventDefault();
    ipc.send('ondragstart', { filepath });
  };
});
