try {
  // provide F12, F5, and activates devtron
  require('electron-debug')({
    showDevTools: false,
    devToolsMode: 'right'
  });
} catch (err) {} // eslint-disable-line no-empty

const path = require('path');
const url = require('url');
const EventEmitter = require('events');
const events = new EventEmitter();

const { app, BrowserWindow, Menu, ipcMain, systemPreferences } = require('electron');

const config = require('./lib/config.js');
const menu = require('./lib/menu.js');
const exiftool = require('./lib/exiftool.js');
const log = require('./lib/log.js')('main');
const debounce = require('./lib/debounce.js');
const analytics = require('./lib/analytics.js');

log.info(`electron node version: ${process.version}`);

let mainWindow;
let stayAlive;

// macOS Mojave light/dark mode changed
const setMacOSTheme = () => {
  if (!(systemPreferences.setAppLevelAppearance && systemPreferences.isDarkMode)) {
    log.info('this system does not support setting app-level appearance');
    return;
  }

  const mode = systemPreferences.isDarkMode() ? 'dark' : 'light';
  log.info(`setting app-level appearance to ${mode}`);
  systemPreferences.setAppLevelAppearance(mode);
};

if (systemPreferences.subscribeNotification) {
  systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', setMacOSTheme);
  setMacOSTheme();
}

function onIpc(ev, data) {
  switch (true) {
    case data.type === 'config-set':
      config.setProp(data.key, data.value);
      break;
    case data.type === 'config-get':
      mainWindow.webContents.send('message', {
        type: 'config-read',
        key: data.key,
        value: config.getProp(data.key)
      });
      break;
    case data.type === 'dragstart':
      ev.sender.startDrag({
        file: data.filepath,
        icon: '' // icon is required :(
      });
  }
}

function createWindow () {
  Promise.all([
    config.read(),
    exiftool.open()
  ]).then(() => {
    Menu.setApplicationMenu(menu.create(events, config.getProp('experiments')));

    const windowOptions = {
      width: config.getProp('window.width') || 1000,
      height: config.getProp('window.height') || 800,
      backgroundColor: '#121212',
      darkTheme: true,
      webPreferences: {
        nodeIntegration: true,
        nodeIntegrationInWorker: true
      },
      frame: process.platform === 'darwin' ? true : !config.getProp('experiments.framelessWindow')
    };

    if (process.platform === 'darwin' && config.getProp('experiments.framelessWindow')) {
      windowOptions.titleBarStyle = 'hidden';
    }

    // Create the browser window.
    mainWindow = new BrowserWindow(windowOptions);

    stayAlive = false;

    if (config.getProp('window.maximized')) {
      mainWindow.maximize();
    }

    mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, 'public', 'index.html'),
      protocol: 'file:',
      slashes: true
    }));

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    mainWindow.on('resize', debounce(() => {
      if (mainWindow.isMaximized() || mainWindow.isMinimized()) {
        return;
      }

      const size = mainWindow.getSize();

      config.setProp('window.width', size[0]);
      config.setProp('window.height', size[1]);
    }, 500));

    mainWindow.on('maximize', () => {
      config.setProp('window.maximized', true);
    });

    mainWindow.on('unmaximize', () => {
      config.setProp('window.maximized', false);
    });

    ipcMain.on('message', onIpc);

    mainWindow.webContents.on('devtools-opened', () => {
      config.setProp('devToolsOpen', true);
    });

    mainWindow.webContents.on('devtools-closed', () => {
      config.setProp('devToolsOpen', false);
    });

    if (config.getProp('devToolsOpen')) {
      mainWindow.webContents.openDevTools();
    }

    events.on('ipcevent', ({ name, data = null }) => {
      mainWindow.webContents.send('ipcevent', { name, data });
    });

    events.on('reload', () => {
      mainWindow.reload();
    });

    events.on('reset', () => {
      stayAlive = true;

      log.info('reopening main window');
      mainWindow.once('close', () => {
        createWindow();
      });

      mainWindow.close();
      mainWindow = null;
    });

    analytics.screenview('main');
    analytics.event('version', app.getVersion());
    analytics.platformInfo();
  }).catch((err) => {
    throw err;
  });
}

function onClose(e) {
  log.info('raw-viewer is closing, cleaning up');
  e.preventDefault();

  exiftool.close().then(() => {
    log.info('exiftool closed successfully');
    app.quit();
  }).catch((err) => {
    log.error('exiftool closed with error', err);
    app.quit();
  });
}

app.once('before-quit', onClose);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform === 'darwin' || stayAlive) {
    events.removeAllListeners();
  } else {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});
