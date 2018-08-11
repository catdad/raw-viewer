/* global postMessage, onmessage */

const { imageUrl } = require('../renderer/util.js');

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

  if (data.name === 'imageUrl') {
    return imageUrl(...data.args).then(data => {
      onDone(null, data);
    }).catch(err => {
      onDone(err);
    });
  }

  onDone(new Error(`${data.name} is an unknown worker command`));
}

onmessage = function (ev) {
  const data = ev.data;

  if (data.type === 'exec') {
    return exec(data);
  }

  console.log('worker received message', ev);
};

postMessage({ type: 'ready' });
