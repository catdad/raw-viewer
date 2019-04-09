/* eslint-disable no-console */

const { spawn } = require('child_process');
const { exiftool: exifToolBin } = require('./third-party.js');
const log = require('./log.js')('exiftool-process');
const events = new (require('events'))();

let proc;

const getId = (() => {
  let count = 0;

  return () => {
    count += 1;
    return count;
  };
})();

const init = (() => {
  let done = false;
  let prom;
  let result;

  const initOnce = async (force) => {
    if (force) {
      done = false;
      prom = result = null;
    }

    if (done) {
      return result;
    }

    if (prom) {
      await prom;
      return result;
    }

    prom = open();
    result = await prom;
    done = true;

    return result;
  };

  return initOnce;
})();

function emitDoneEvents(stream) {
  let chunks = '';

  const beginReady = /{begin(\d+)}([\s\S]*){ready\1}/;

  stream.on('data', chunk => {
    chunks += chunk.toString();

    const result = (chunks + '').match(beginReady);

    if (!result) {
      return;
    }

    const id = result[1];
    const data = result[2].trim();

    events.emit(`result${id}`, data);
  });
}

async function open() {
  const begun = Math.random().toString(36).slice(2);

  proc = spawn(exifToolBin, [ '-echo2', begun, '-stay_open', 'True', '-@', '-' ], {
    stdio: 'pipe'
  });

  await new Promise((resolve, reject) => {
    const onErr = err => reject(err);
    const onBegun = () => {
      proc.removeListener('error', onErr);

      resolve();
    };

    let chunks = '';
    const onData = chunk => {
      chunks += chunk.toString();

      if (chunks.slice(0, begun.length) === begun) {
        onBegun();
      } else {
        proc.stderr.once('data', onData);
      }
    };

    proc.stderr.once('data', onData);
    proc.on('error', onErr);
  });

  proc.on('error', err => {
    log.error('exiftool process exited with error', err);
    proc = null;

    init(true);
  });

  emitDoneEvents(proc.stdout);
}

async function close() {
  await new Promise((resolve, reject) => {
    proc.on('exit', code => {
      if (code === 0) {
        return resolve();
      }

      reject(new Error(`exit code ${code}`));
    });

    proc.stdin.write('-stay_open\nFalse\n');
  });
}

async function execute(args) {
  const id = getId();

  // TODO how do errors work?
  return new Promise(resolve => {
    events.once(`result${id}`, data => {
      resolve(data);
    });

    const line = args.concat([
      '-echo1',
      `{begin${id}}`,
      `-execute${id}`
    ]).join('\n') + '\n';

    proc.stdin.write(line);
  });
}

module.exports = {
  open: init,
  close: close,
  execute: execute
};
