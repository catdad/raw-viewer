function createOverlapDebouncer() {
  let lock;

  return (func, afterLock) => {
    return function recursiveWait(...args) {
      if (lock) {
        return lock.then(() => {
          return recursiveWait(...args);
        }).catch(() => {
          return recursiveWait(...args);
        });
      }

      lock = func(...args);

      lock.then((data) => {
        lock = null;

        if (afterLock) {
          return afterLock().then(() => {
            return Promise.resolve(data);
          });
        } else {
          return Promise.resolve(data);
        }
      }).catch(err => {
        lock = null;
        return Promise.reject(err);
      });

      return lock;
    };
  };
}

module.exports = createOverlapDebouncer;
