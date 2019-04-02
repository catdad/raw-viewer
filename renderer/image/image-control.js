const log = require('../../lib/log.js')('image-control');
const keys = require('../tools/keyboard.js');

function int(num) {
  return Math.floor(num);
}

function evenInt(num) {
  const i = int(num);

  return i % 2 ? i - 1 : i;
}

module.exports = ({ name, elem }) => {
  let box;
  let scale = 1;
  let width = 0;
  let height = 0;
  let isRotated = false;
  let rotateStyle = '';
  let zoomType = 'fit';

  const img = document.createElement('img');
  const container = document.createElement('div');
  container.className = `${name}-container`;

  container.appendChild(img);

  function refreshBox() {
    const rect = elem.getBoundingClientRect();

    box = {
      width: rect.width - 20,
      height: rect.height - 20,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      top: rect.top
    };
  }

  refreshBox();

  window.addEventListener('resize', () => {
    // TODO don't do this on every single event
    refreshBox();
  });

  function zoomToScale(toScale, { forceCenter = false, lockX = 0.5, lockY = 0.5 } = {}) {
    // JavaScript math sucks
    scale = Math.min(Number(toScale.toFixed(2)), 1);

    log.info(`zoom to scale: ${scale}, lockX: ${lockX}, lockY: ${lockY}, forceCenter: ${forceCenter}`);

    // calculate scroll percentage before the zoom operation
    const imgRect = img.getBoundingClientRect();
    const before = {
      // TODO doesn't work when the image is smaller than the viewport
      top: forceCenter ? 0.5 : (elem.scrollTop + (box.height * lockY)) / imgRect.height,
      left: forceCenter ? 0.5 : (elem.scrollLeft + (box.width * lockX)) / imgRect.width
    };

    const targetWidth = evenInt(width * scale);
    const targetHeight = evenInt(height * scale);

    const transformWidth = targetWidth > box.width ?
      int((targetWidth / 2) - (box.width / 2)) : 0;

    const transformHeight = targetHeight > box.height ?
      int((targetHeight / 2) - (box.height / 2)) : 0;

    if (isRotated) {
      img.style.width = `${targetHeight}px`;
      img.style.height = `${targetWidth}px`;
      img.style.transform = rotateStyle;
    }  else {
      img.style.width = `${targetWidth}px`;
      img.style.height = `${targetHeight}px`;
    }

    container.style.width = `${targetWidth}px`;
    container.style.height = `${targetHeight}px`;
    container.style.transform = `translate(${transformWidth}px, ${transformHeight}px)`;

    // scroll to same percentage as before the zoom
    // this math doesn't seem right... it is supposed to always be lockX/Y in the last element
    // but for some reason, that breaks click to zoom... so I am leaving this and I will figure
    // out the math later
    elem.scrollTop = (targetHeight * before.top) - (box.height * (lockY === 0.5 ? 0.5 : before.top));
    elem.scrollLeft = (targetWidth * before.left) - (box.width * (lockX === 0.5 ? 0.5 : before.left));
  }

  function zoomToBestFit() {
    const scale = Math.min(
      box.width / width,
      box.height / height
    );

    zoomToScale(scale, true);
  }

  function zoom(toScale, opts) {
    if (toScale === 'fit') {
      zoomType = 'fit';
      return zoomToBestFit();
    }

    zoomType = 'custom';

    return zoomToScale(toScale, opts);
  }

  function onclick(ev) {
    const zout = keys.includes(keys.ALT) && keys.includes('z');
    const zin = keys.includes('z') && !zout;

    const rect = img.getBoundingClientRect();

    function evcenter() {
      return {
        lockX: (ev.clientX - rect.left) / rect.width,
        lockY: (ev.clientY - rect.top) / rect.height
      };
    }

    if (scale > 0.1 && zout) {
      // zooming out
      zoom(scale - 0.1, evcenter());
    } else if (scale < 1 && zin) {
      // zooming in
      zoom(scale + 0.1, evcenter());
    }
  }

  function load({ imageUrl, rotation }) {
    width = img.width;
    height = img.height;
    rotateStyle = rotation === 0 ? '' : `rotate(${rotation}deg)`;
    isRotated = rotation === 90 || rotation === 270;

    refreshBox();

    img.onload = function () {
      if (isRotated) {
        width = img.naturalHeight;
        height = img.naturalWidth;
      } else {
        width = img.naturalWidth;
        height = img.naturalHeight;
      }

      if (zoomType === 'fit') {
        zoomToBestFit();
      } else {
        zoomToScale(scale);
      }
    };

    elem.onclick = onclick;

    img.style.transform = '';
    img.src = imageUrl;
  }

  return {
    dom: container,
    load,
    zoom
  };
};
