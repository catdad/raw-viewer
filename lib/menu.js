const { Menu } = require('electron');
const config = require('./config.js');

const name = 'menu';
const isomorphic = require('./isomorphic.js');
let mainMenu;

function createMenu(events, experiments = {}) {
  const experimentsList = [
    {
      label: 'Render From Raw Button',
      type: 'checkbox',
      click: (item) => {
        config.setProp('experiments.renderFromRaw', !!item.checked);
      },
      checked: !!experiments.renderFromRaw,
    },
    {
      label: 'Filmstrip on the left',
      type: 'checkbox',
      click: (item) => {
        config.setProp('experiments.filmstripOnLeft', !!item.checked);
        events.emit('reload');
      },
      checked: !!experiments.filmstripOnLeft
    }
  ];

  if (process.platform === 'win32') {
    experimentsList.push({
      label: 'Frameless Window',
      type: 'checkbox',
      click: (item) => {
        config.setProp('experiments.framelessWindow', !!item.checked);
        events.emit('reset');
      },
      checked: !!experiments.framelessWindow
    });
  }

  const template = [{
    label: process.platform === 'darwin' ? 'Raw Viewer' : 'Menu',
    submenu: [
      {
        label: 'Open',
        click: () => {
          events.emit('ipcevent', { name: 'directory:open' });
        }
      },
      { type: 'separator' },
      { role: 'copy' },
      { type: 'separator' },
      {
        label: 'About',
        click: () => {
          events.emit('ipcevent', { name: 'about' });
        }
      },
      {
        label: 'Check for Updates',
        click: () => {
          events.emit('ipcevent', { name: 'check-for-update' });
        }
      },
      { role: 'reload' },
      { role: 'quit' }
    ]
  }, {
    label: 'Experiments',
    submenu: experimentsList
  }];

  mainMenu = Menu.buildFromTemplate(template);

  return mainMenu;
}

async function openContext(opts) {
  if (!mainMenu) {
    return;
  }

  mainMenu.popup(opts);
}

async function closeContext() {
  if (!mainMenu) {
    return;
  }

  mainMenu.closePopup();
}

const implementation = {
  create: createMenu,
  openContext,
  closeContext
};

module.exports = isomorphic({ name, implementation });
