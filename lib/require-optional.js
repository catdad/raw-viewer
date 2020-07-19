module.exports = name => {
  try {
    return require(name);
  } catch (e) {
    return null;
  }
};
