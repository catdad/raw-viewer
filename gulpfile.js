/* eslint-disable no-console */

var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

var gulp = require('gulp');
var _ = require('lodash');
var sequence = require('run-sequence');

var pkg = require('./package.json');
process.title = pkg.name;

var server;

gulp.task('electron:start', function () {
  process.title = pkg.name;

  return new Promise(function (resolve) {
    var electron = require('electron');

    server = spawn(electron, ['.'], {
      stdio: 'inherit',
      cwd: __dirname
    });

    server.on('exit', function (code) {
      if (server) {
        console.log('server exited with code', code);
        console.log('waiting for a change to restart it');
      }

      server = null;
    });

    return resolve();
  });
});

gulp.task('electron:kill', function () {
  if (!server) {
    return;
  }

  var temp = server;
  server = null;

  return Promise.all([
    new Promise(function (resolve) {
      temp.on('exit', function () {
        resolve();
      });
    }),
    new Promise(function (resolve) {
      temp.on('close', function () {
        resolve();
      });
    }),
    new Promise(function (resolve) {
      temp.kill();
      resolve();
    })
  ]).then(function () {
    return new Promise(function (resolve) {
      exec('npm run exif-kill', function (err, stdout, stderr) {
        if (err) {
          console.log(err);
        } else {
          if (stdout.trim()) {
            console.log(stdout);
          }

          if (stderr.trim()) {
            console.log(stderr);
          }
        }

        resolve();
      });
    });
  });
});

gulp.task('restart', function (done) {
  sequence('electron:kill', 'electron:start', done);
});

gulp.task('dev', ['restart'], function () {
  var onchange = _.debounce(function () {
    sequence('restart');
  }, 500);

  // all the server files are watched here
  gulp.watch('main.js', onchange);
  gulp.watch('lib/**/*.js', onchange);
});
