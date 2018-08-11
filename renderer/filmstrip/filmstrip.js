const fs = require('fs-extra');
const path = require('path');
const EventEmitter = require('events');

const log = require('../../tools/log.js')('filmstrip');

const name = 'filmstrip';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

const workers = (function (count) {
  const arr = [];
  const queue = [];
  const events = new EventEmitter();

  function flushQueue() {
    if (!queue.length) {
      return;
    }

    log.info('flushing %s queued tasks with %s workers', queue.length, arr.length);

    while (arr.length && queue.length) {
      queue.shift()();
    }
  }

  async function spawnWorkers() {
    function createWorker(idx) {
      return new Promise((resolve) => {
        // this path is relative to index.html
        const worker = new Worker('./filmstrip-worker.js');

        worker.onmessage = function (ev) {
          if (ev.data.type === 'ready') {
            return resolve(worker);
          }

          if (ev.data.type === 'done') {
            return events.emit(`done:${idx}`, ev.data);
          }

          log.info('worker message', ev);
        };

        worker.idx = idx;

        return worker;
      });
    }

    while (arr.length < count) {
      arr.push(await createWorker(arr.length));
    }

    flushQueue();
  }

  log.time('worker init');

  spawnWorkers().then(() => {
    log.timeEnd('worker init');
  }).catch(err => {
    log.error('failed to create workers', err);
  });

  function exec(name, args) {
    return new Promise((resolve, reject) => {
      function doWork() {
        const worker = arr.shift();

        events.once(`done:${worker.idx}`, res => {
          log.info('post message overhead', Date.now() - res.epoch, 'ms');
          arr.push(worker);

          flushQueue();

          if (res.err) {
            return reject(res.err);
          }

          return resolve(res.data);
        });

        worker.postMessage({
          type: 'exec',
          name, args
        });
      }

      if (!arr.length) {
        // there are no workers, add this exec to queue
        return queue.push(doWork);
      }

      return doWork();
    });
  }

  return { exec };
}(4));

module.exports = function ({ events }) {
  var elem = document.createElement('div');
  elem.className = name;

  var wrapper = document.createElement('div');
  wrapper.className = `${name}-wrapper`;

  elem.appendChild(wrapper);

  wrapper.addEventListener('mousewheel', function (ev) {
    wrapper.scrollLeft -= ev.wheelDeltaY;
    ev.preventDefault();
  });

  function handleDisplay(thumb) {
    thumb.addEventListener('click', function () {
      events.emit('load:image', {
        filepath: thumb.getAttribute('data-filepath'),
        imageUrl: thumb['data-imageurl']
      });
    });
  }

  async function loadThumbnails(dir) {
    log.time('loadThumbs');

    var files = await fs.readdir(dir);

    wrapper.innerHTML = '';

    const fragment = document.createDocumentFragment();
    const promises = [];

    for (let file of files) {
      let filepath = path.resolve(dir, file);
      let thumb = document.createElement('div');
      thumb.className = 'thumbnail';
      thumb.setAttribute('data-filename', file);
      thumb.setAttribute('data-filepath', filepath);

      promises.push((async () => {
        thumb['data-imageurl'] = await workers.exec('imageUrl', [filepath]);

        thumb.style.backgroundImage = `url("${thumb['data-imageurl']}")`;
      })());

      handleDisplay(thumb);

      fragment.appendChild(thumb);
    }

    wrapper.appendChild(fragment);

    await Promise.all(promises);

    log.timeEnd('loadThumbs');
  }

  events.on('load:directory', function ({ dir }) {
    loadThumbnails(dir);
  });

  return { elem, style };
};
