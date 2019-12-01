const { Menu } = require('electron');
const config = require('./config.js');

const name = 'menu';
const isomorphic = require('./isomorphic.js');
let mainMenu;

function createMenu({ events, experiments = {}, disableAnalytics }) {
  const experimentsList = [
    {
      label: 'Render from RAW button',
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
    },
    {
      label: 'Disable cache (slow)',
      type: 'checkbox',
      click: (item) => {
        config.setProp('experiments.disableCache', !!item.checked);
        events.emit('reload');
      }
    }
  ];

  if (['win32', 'darwin'].includes(process.platform)) {
    experimentsList.push({
      label: 'Frameless window',
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
        label: 'Check for updates',
        click: () => {
          events.emit('ipcevent', { name: 'check-for-update' });
        }
      },
      {
        label: 'Keyboard shortcuts',
        click: () => {
          events.emit('ipcevent', { name: 'shortcuts' });
        }
      },
      { type: 'separator' },
      {
        label: 'Disable analytics',
        type: 'checkbox',
        click: (item) => {
          config.setProp('disableAnalytics', !!item.checked);
        },
        checked: disableAnalytics
      },
      { type: 'separator' },
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

  await new Promise(resolve => {
    mainMenu.once('menu-will-close', () => resolve());
  });
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
