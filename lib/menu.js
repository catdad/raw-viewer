const { Menu } = require('electron');
const config = require('./config.js');

module.exports = (events, experiments = {}) => {
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
      { role: 'reload' },
      { role: 'quit' }
    ]
  }, {
    label: 'Experiments',
    submenu: [
      {
        label: 'Render From Raw Button',
        type: 'checkbox',
        click: (item) => {
          config.setProp('experiments.renderFromRaw', !!item.checked);
        },
        checked: !!experiments.renderFromRaw,
      }
    ]
  }];

  return Menu.buildFromTemplate(template);
};
