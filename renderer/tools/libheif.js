const workerize = require('workerize');

const name = 'libheif';
const log = require('../../lib/log.js')(name);
const timing = require('../../lib/timing.js')(name);
const image = require('../../lib/image.js');

const workerQueue = (count) => {
  const workers = new Array(count).fill(null).map(() => {
    // create the workers
    return workerize((exports) => {
      /*
      export function jpg() {}
      */
      const path = require('path');
      const fs = require(path.resolve(process.cwd(), 'node_modules/fs-extra'));
      const decode = require(path.resolve(process.cwd(), 'node_modules/heic-decode'));

      const raw = async (filepath) => {
        const buffer = await fs.readFile(filepath);
        const { width, height, data } = await decode({ buffer });
        return { width, height, data };
      };

      exports.jpg = async ({ filepath }) => await raw(filepath);
    });
  }).map((worker, idx) => {
    worker.idx = idx;
    return worker;
  });

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

  async function withWorker(func) {
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
  const { withWorker } = workerQueue(count);

  async function jpg(filepath) {
    const { width, height, data } = await timing({
      label: `worker ${filepath}`,
      func: async () => await withWorker(worker => worker.jpg({ filepath }))
    });

    return await timing({
      label: `render ${filepath}`,
      func: async () => await image.imageDataToJpeg(data, width, height)
    });
  }

  return { jpg };
};
