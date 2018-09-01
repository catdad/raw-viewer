const { BrowserWindow } = require('electron');
const chokidar = require('chokidar');

const watcher = chokidar.watch(['renderer', 'public'], {
  ignored: [
    /(^|[/\\])\../, // Dotfiles
    'node_modules',
    '**/*.map'
  ]
});

watcher.on('change', function () {
  console.log('reloading open windows');

  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.reloadIgnoringCache();
  }
});
