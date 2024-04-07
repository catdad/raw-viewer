const path = require('path');

const { expect } = require('chai');
const chalk = require('chalk');
const waitForThrowable = require('wait-for-throwable');
const { launch } = require('puptron');

const pkg = require('../../package.json');
const configVar = `${pkg.name.toUpperCase().replace(/-/g, '_')}_CONFIG_PATH`;

function isInView(containerBB, elBB) {
  return (!(
    elBB.top >= containerBB.bottom ||
    elBB.left >= containerBB.right ||
    elBB.bottom <= containerBB.top ||
    elBB.right <= containerBB.left
  ));
}

const utils = page => ({
  click: async selector => await page.click(selector),
  getRect: async selector => await page.evaluate(s => document.querySelector(s).getBoundingClientRect(), selector),
  getText: async selector => {
    return await page.evaluate(s => document.querySelector(s).innerText, selector);
  },
  getElementAttribute: async (element, name) => {
    return await element.evaluate((el, name) => el.getAttribute(name), name);
  },
  waitForVisible: async selector => {
    const { getRect } = utils(page);
    const pageRect = await getRect('body');

    await waitForThrowable(async () => {
      const elemRect = await getRect(selector);

      if (!isInView(pageRect, elemRect)) {
        throw new Error(`element "${selector}" is still not visible`);
      }
    });
  },
  waitForElementCount: async (selector, count = 1) => {
    return await waitForThrowable(async () => {
      const elements = await page.$$(selector);
      const errStr = `expected ${count} of element "${selector}" but found ${elements.length}`;

      expect(elements.length, errStr).to.equal(count);

      return elements;
    });
  }
});

let _browser;

module.exports = {
  start: async (configPath = '') => {
    _browser = await launch(['.'], {
      cwd: path.resolve(__dirname, '../..'),
      env: {
        [configVar]: configPath,
        CI: true
      },
      rendererInterval: 500,
      rendererTimeout: 20 * 1000
    });

    const [page] = await _browser.pages();

    return {
      page,
      browser: _browser,
      utils: utils(page)
    };
  },
  stop: async (printLogs) => {
    if (!_browser) {
      return;
    }

    if (printLogs || process.env.VERBOSE) {
      const logs = _browser.getLogs().map(str => {
        const clean = str.replace(/^\[[0-9:/.]+INFO:CONSOLE\([0-9]+\)\]\s{0,}/, '');

        return clean === str ? chalk.yellow(str) : chalk.cyan(clean);
      }).join('');

      /* eslint-disable-next-line no-console */
      console.log(logs);
    }

    // this is needed in order to perform the exiftool cleanup logic
    const pages = await _browser.pages();

    if (pages.length) {
      for (const page of pages) {
        await page.evaluate(() => window.close()).catch(() => {});
      }
    } else {
      await _browser.close();
    }

    _browser = null;
  }
};
