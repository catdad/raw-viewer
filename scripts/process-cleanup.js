/* eslint-disable no-console */

// Note: none of this script is good practice, so try
// not to copy it or anything.

const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');

if (process.platform !== 'win32') {
  console.log('process cleanup not implemented for this platform');
  process.exit(0);
}

const { stdout, status } = spawnSync('wmic', ['process', 'get', 'ProcessID,ExecutablePath']);

if (status) {
  process.exitCode = status;
}

stdout.toString()
  .trim()
  .split('\n')
  .map(s => s.trim())
  .filter(s => !/^\d+$/.test(s))
  .slice(1)
  .map(s => {
    const pid = s.match(/(\d+)$/)[1];
    const loc = s.replace(/\d+$/, '').trim();

    return { pid, loc };
  })
  .filter(({ loc }) => loc.indexOf(root) === 0)
  .filter(({ loc }) => /electron|exiftool/.test(loc))
  .forEach(({ pid, loc }) => {
    process.stdout.write(`\n${pid}  "${loc}"\n  `);
    spawnSync('taskkill', ['/PID', pid, '/F'], { stdio: 'inherit' });
  });
