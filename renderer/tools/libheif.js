const EventEmitter = require('events');
const sharp = require('sharp');

const name = 'libheif';
const log = require('../../lib/log.js')(name);
const timing = require('../../lib/timing.js')(name);

// USAGE:
// let workers = require('workers.js')(4);
// let data = await workers.<name of func>(...args);

module.exports = (count) => {
  const workers = [];
  const queue = [];
  const events = new EventEmitter();

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
        const worker = new Worker('./libheif-worker.js');

        worker.onmessage = ({ data: result }) => {
          if (result.type === 'ready') {
            return resolve(worker);
          }

          events.emit(`done:${idx}`, result);
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

  log.timing('worker init', () => spawnWorkers()).then(() => {
    log.info('workers ready');
  }).catch(err => {
    log.error('failed to create workers', err);
  });

  async function raw(filepath) {
    return await new Promise((resolve, reject) => {
      function doWork() {
        const worker = workers.shift();
        log.info(`convert ${filepath} on worker ${worker.idx}`);

        events.once(`done:${worker.idx}`, res => {
          log.info(`thread send overhead: ${Date.now() - res.epoch}ms`);
          workers.push(worker);
          setImmediate(flushQueue);

          if (res.error) {
            return reject(res.error);
          }

          return resolve(res);
        });

        worker.postMessage({ filepath });
      }

      if (!workers.length) {
        // there are no workers, add this exec to queue
        return queue.push(doWork);
      }

      return doWork();
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
