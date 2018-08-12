/* global postMessage */

const { imageUrl, imageUint8Array } = require('../renderer/util.js');
const log = require('../tools/log.js')('worker');

function exec(data) {
  function onDone(err, res) {
    const result = {
      type: 'done',
      epoch: Date.now()
    };

    if (err) {
      result.err = err;
    } else {
      result.data = res;
    }

    postMessage(result);
  }

  function execPromise(prom) {
    prom.then(data => {
      onDone(null, data);
    }).catch(err => {
      onDone(err);
    });
  }

  if (data.name === 'imageUint8Array') {
    return execPromise(imageUint8Array(...data.args));
  }

  if (data.name === 'imageUrl') {
    return execPromise(imageUrl(...data.args));
  }

  onDone(new Error(`${data.name} is an unknown worker command`));
}

// eslint-disable-next-line no-undef
onmessage = function (ev) {
  const data = ev.data;

  if (data.type === 'exec') {
    return exec(data);
  }

  log.info('worker received message', ev);
};

postMessage({ type: 'ready' });
