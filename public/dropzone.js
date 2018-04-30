/* eslint-env browser: true */

console.log('the script loaded');

const dropArea = document.querySelector('#dropzone');

function handlerFunction(ev) {
  ev.preventDefault();
  ev.stopPropagation();

  console.log(ev);
}

function stop() {
  return false;
}

dropArea.ondragover = stop;
dropArea.ondragleave = stop;
dropArea.ondragend = stop;

dropArea.ondrop = (e) => {
  e.preventDefault();

  console.log(e);

  for (let f of e.dataTransfer.files) {
    console.log('File(s) you dragged here: ', f.path)
  }

  return false;
};
