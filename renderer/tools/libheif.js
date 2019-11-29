const EventEmitter = require('events');
const sharp = require('sharp');

const name = 'libheif';
const log = require('../../lib/log.js')(name);
const timing = require('../../lib/timing.js')(name);

// USAGE:
// let workers = require('workers.js')(4);
// let data = await workers.<name of func>(...args);

const workerQueue = (workerPath, count) => {
  const workers = [];
  const queue = [];

  function flushQueue() {
    if (!queue.length) {
      return;
    }

    log.info('flushing %s queued tasks with %s workers', queue.length, workers.length);

    while (workers.length && queue.length) {
      queue.shift()();
    }
  }

  async function spawnWorkers() {
    function createWorker(idx) {
      return new Promise((resolve) => {
        log.info(`spawn worker ${idx}`);

        // this path is relative to index.html
        const worker = new Worker(workerPath);
        const events = new EventEmitter();

        Object.assign(worker, {
          on: events.on.bind(events),
          off: events.off.bind(events),
          once: events.once.bind(events)
        });

        worker.onmessage = ({ data: result }) => {
          if (result.type === 'ready') {
            return resolve(worker);
          }

          events.emit('message', result);
        };

        worker.idx = idx;

        return worker;
      });
    }

    while (workers.length < count) {
      workers.push(await createWorker(workers.length));
    }

    setImmediate(flushQueue);
  }

  timing({
    label: 'workers init',
    func: () => spawnWorkers()
  }).catch(err => {
    log.error('failed to create workers:', err);
  });

  async function withWorker(func) {
    if (!workers.length) {
      await new Promise(resolve => queue.push(() => resolve()));
      return await withWorker(func);
    }

    const worker = workers.shift();
    let result;

    try {
      result = await func(worker);
    } catch (e) {
      throw e;
    } finally {
      workers.push(worker);
      setImmediate(flushQueue);
    }

    return result;
  }

  return { withWorker };
};

module.exports = (count) => {
  const { withWorker } = workerQueue('./libheif-worker.js', count);

  async function raw(filepath) {
    return await withWorker(async worker => {
      log.info(`convert ${filepath} on worker ${worker.idx}`);

      return new Promise((resolve, reject) => {
        worker.once('message', res => {
          log.info(`thread send overhead: ${Date.now() - res.epoch}ms`);

          if (res.error) {
            return reject(res.error);
          }

          return resolve(res);
        });

        worker.postMessage({ filepath });
      });
    });
  }

  async function jpg(filepath) {
    const { width, height, data } = await timing({
      label: `worker ${filepath}`,
      func: () => raw(filepath)
    });

    return await timing({
      label: `render ${filepath}`,
      func: async () => await sharp(Buffer.from(data), {
        raw: { width, height, channels: 4 }
      }).jpeg().toBuffer()
    });
  }

  return { jpg };
};
