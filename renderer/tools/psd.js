const name = 'psd';
const log = require('../../lib/log.js')(name);
const timing = require('../../lib/timing.js')(name);
const workerQueue = require('./worker-queue.js');

module.exports = (count) => {
  const { withWorker } = workerQueue('./psd-worker.js', count, log, timing);

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
    const { data } = await timing({
      label: `worker ${filepath}`,
      func: () => raw(filepath)
    });

    return Buffer.from(data);
  }

  return { jpg };
};
