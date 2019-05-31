// unlike lodash.debounce, this debounce is infinite, and will
// never call the function as long as it keeps getting called
module.exports = function debounce(func, time) {
  let timer;

  return (...args) => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    timer = setTimeout(() => {
      timer = null;
      func(...args);
    }, time);
  };
};
