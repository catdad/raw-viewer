/* eslint-disable no-console */

const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);
const path = require('path');
const fs = require('fs-extra');
const fetch = require('node-fetch');

const { fontsDir } = require('../lib/third-party.js');

const css = `
/* latin-ext */
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  src: url(KFOmCnqEu92Fr1Mu7GxKOzY.woff2) format('woff2');
  unicode-range: U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF;
}

/* latin */
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  src: url(KFOmCnqEu92Fr1Mu4mxK.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* latin bold */
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(KFOlCnqEu92Fr1MmWUlfBBc4.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* material icons */
@font-face {
  font-family: 'Material Icons';
  font-style: normal;
  font-weight: 400;
  src: url(flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2) format('woff2');
}
.material-icons {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}
`;

const fonts = {
  // roboto latin
  'KFOmCnqEu92Fr1Mu4mxK.woff2': 'https://fonts.gstatic.com/s/roboto/v19/KFOmCnqEu92Fr1Mu4mxK.woff2',
  // roboto latin-ext
  'KFOmCnqEu92Fr1Mu7GxKOzY.woff2': 'https://fonts.gstatic.com/s/roboto/v19/KFOmCnqEu92Fr1Mu7GxKOzY.woff2',
  // roboto latin bold
  'KFOlCnqEu92Fr1MmWUlfBBc4.woff2': 'https://fonts.gstatic.com/s/roboto/v19/KFOlCnqEu92Fr1MmWUlfBBc4.woff2',
  // material icons
  'flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2': 'https://fonts.gstatic.com/s/materialicons/v47/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2',
};

require('./lib.run.js')('fonts', async () => {
  await fs.ensureDir(fontsDir);
  await fs.outputFile(path.resolve(fontsDir, 'fonts.css'), css);

  for (let name in fonts) {
    const res = await fetch(fonts[name]);

    if (!res.ok) {
      throw new Error(`failed to fetch font "${name}": ${res.status} ${res.statusText}`);
    }

    await pipeline(
      res.body,
      fs.createWriteStream(path.join(fontsDir, name))
    );
  }
});
