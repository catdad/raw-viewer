const { Menu } = require('electron');
const config = require('./config.js');

module.exports = (events, experiments = {}) => {
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

  return Menu.buildFromTemplate(template);
};
