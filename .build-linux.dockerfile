FROM ubuntu:18.04

ARG REF
ARG SHA

COPY . /app

ENV DEBIAN_FRONTEND noninteractive
ENV FORCE_COLOR 1

# dependecies:
# - build-essential: compiling with node-gyp
# - wget: to get stuff, duh
# - curl: also to get stuff
# - xvfb: to run headless electron tests
# - gnupg: apparently needed to run node
# - zip and unzip: needed by electron-packager to build the package
# - everything else: chromium dependencies (taken from puppeteer dockerfile)
# - node: for testing things

RUN apt update -qq
RUN apt install --yes -qq build-essential wget xvfb curl gnupg zip unzip \
    gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 \
    libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
    libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
    libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils

RUN curl -sL https://deb.nodesource.com/setup_10.x | bash \
    && apt install --yes nodejs

RUN node -v
RUN npm -v

WORKDIR /app

RUN npm ci --unsafe-perm
RUN UNSAFE_CI=1 npm run citest
RUN npm run package -- --ref $REF --sha $SHA --upload

FROM ubuntu:18.04

COPY --from=0 /app/dist /dist
