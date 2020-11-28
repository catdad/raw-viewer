const { spawn } = require('child_process');
const { exiftool: exifToolBin } = require('./third-party.js');
const log = require('./log.js')('exiftool-process');
const events = new (require('events'))();

let proc;
let executing;

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

const onUnexpectedErr = (err) => {
  log.error('exiftool process exited with error', err);
  proc = null;

  // TODO gotta test this out to make sure it works and whatnot
  init(true);
};

function emitDoneEvents(outstream, errstream) {
  let outstr = '';
  let errstr = '';

  const beginReady = /{begin(\d+)}([\s\S]*){ready\1}/;

  outstream.on('data', chunk => {
    outstr += chunk.toString();

    const result = (outstr + '').match(beginReady);

    if (!result) {
      return;
    }

    const id = result[1];
    const data = result[2].trim();

    outstr = errstr = '';
    events.emit(`result${id}`, { out: data });
  });

  errstream.on('data', chunk => {
    errstr += chunk.toString();

    const result = (errstr + '').match(beginReady);

    if (!result) {
      return;
    }

    const id = result[1];
    const error = result[2].trim();

    if (error === '') {
      return;
    }

    outstr = errstr = '';
    events.emit(`result${id}`, { error: error });
  });
}

async function open() {
  log.info('opening');

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

  proc.on('error', onUnexpectedErr);

  emitDoneEvents(proc.stdout, proc.stderr);

  log.info('opened');
}

async function close() {
  if (!proc) {
    return;
  }

  log.info('closing');

  await new Promise((resolve, reject) => {
    proc.on('exit', code => {
      proc = null;

      if (code === 0) {
        return resolve();
      }

      reject(new Error(`exit code ${code}`));
    });

    proc.stdin.write('-stay_open\nFalse\n');
  });

  log.info('closed');
}

async function execute(args) {
  if (executing) {
    return await new Promise((resolve, reject) => {
      executing.finally(() => {
        execute(args).then(resolve).catch(reject);
      });
    });
  }

  const id = getId();

  executing = new Promise(resolve => {
    events.once(`result${id}`, result => {
      resolve(result);
    });

    const line = args.concat([
      '-echo1',
      `{begin${id}}`,
      '-echo2',
      `{begin${id}}`,
      '-echo4',
      `{ready${id}}`,
      `-execute${id}`
    ]).join('\n') + '\n';

    proc.stdin.write(line);
  });

  const result = await executing;
  executing = null;

  return result;
}

async function executeJson(args) {
  const result = await execute(['-json', '-s', '-ignoreMinorErrors'].concat(args));

  if (result.error) {
    return result;
  }

  let json;

  try {
    json = JSON.parse(result.out);
  } catch (e) {
    throw new Error('did not receive valid json response');
  }

  return { out: json };
}

module.exports = {
  open: init,
  close,
  execute,
  executeJson
};
