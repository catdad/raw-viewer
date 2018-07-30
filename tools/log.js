module.exports = function createLog(name) {
  const header = '[' + name + ']';

  function log() {
    console.log(header, ...arguments);
  }

  function error() {
    console.error(header, ...arguments);
  }

  function trace() {
    console.trace(header, ...arguments);
  }

  return { log, error, trace };
};
