const EventEmitter = require('events');
const timingLib = require('../../lib/timing.js')('worker-queue');

module.exports = (workerPath, count, log = null, timing = timingLib) => {
  const workers = [];
  const queue = [];

  function flushQueue() {
    if (!queue.length) {
      return;
    }

    if (log) {
      log.info('flushing %s queued tasks with %s workers', queue.length, workers.length);
    }

    while (workers.length && queue.length) {
      queue.shift()();
    }
  }

  async function spawnWorkers() {
    let created = 0;

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

    while (created < count) {
      created += 1;
      workers.push(await createWorker(workers.length));
      setImmediate(flushQueue);
    }
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
