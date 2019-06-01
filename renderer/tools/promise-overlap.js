function createOverlapDebouncer() {
  return (func) => {
    let lock;

    async function waitForLock() {
      try {
        if (lock) {
          await lock;
        }
      } catch (e) {} // eslint-disable-line no-empty
    }

    return async (...args) => {
      await waitForLock();

      lock = func(...args);

      try {
        return await lock;
      } catch (e) {
        throw e;
      } finally {
        lock = null;
      }
    };
  };
}

module.exports = createOverlapDebouncer;
