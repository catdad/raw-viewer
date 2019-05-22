/* eslint-disable no-console */

const chalk = require('chalk');
const figures = require('figures');

module.exports = (title, prom) => {
  const start = Date.now();

  prom().then(() => {
    const end = Date.now();
    console.log(`${chalk.green(figures.tick)} ${title} fetched successfully in ${end - start}ms`);
  }).catch(err => {
    const end = Date.now();
    console.error(`${chalk.red(figures.cross)} error fetching ${title} in ${end - start}ms`);
    console.error(err);
    process.exitCode = 1;
  });
};
