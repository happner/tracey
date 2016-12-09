
var fs = require('fs-extra')
  , path = require('path')
  , EventEmitter = require('events').EventEmitter
  , util = require('util')
  , Promise = require('bluebird')
  , logUpdate = require('log-update')
  , figures = require('figures')
  , chalk = require('chalk')
  , join = require('path').join
  , meow = require('meow')
  , updateState = require('./update-state')
  , getVersions = require('./get-versions')
  , pullImage = require('./pull-image')
  , parseConfig = require('./parse-config')
  , states = require('./states')
  , clean = require('./clean')
  , build = require('./build')
  , copy = require('./util/copy')
  , stat = require('./util/stat')
  , test = require('./test')

;

function TestRunner(job){

  this.events = new EventEmitter();
  this.repo = job.message.repo;
  this.folder = job.folder;
  this.config = job.config;
}

TestRunner.prototype.start = function(callback){

  try{

    this.emit('info', 'starting runner, repo: ' + this.repo);

    var path = process.cwd();

    if (!stat(join(path, 'package.json'))) {
      console.log('\n  ' + chalk.red('error') + ' package.json does not exist in the current directory\n');
      process.exit(1);
    }

    var pkg = require(join(path, 'package.json'));

    // if there's no .dockerignore
    // copy .gitignore to .dockerignore
    var exists = stat(join(path, '.dockerignore'));

    if (!exists) {
      copy(join(path, '.gitignore'), join(path, '.dockerignore'));
    }

    var state = {};
    var errors = {};

    var config = parseConfig(join(path, '.travis.yml'));

    if (config.language !== 'node_js') {
      console.log('\n  ' + chalk.red('error') + ' only Node.js is supported\n');
      process.exit(1);
    }

    getVersions(config)

      .map(function (version) {
        var context = {
          version: version,
          name: pkg.name.toLowerCase(),
          path: path,
          args: cli.flags
        };

        return Promise.resolve(context)
          .tap(function () {
            state[version] = states.downloading;
            updateState(state);
          })

          .then(pullImage)
          .tap(function () {
            state[version] = states.building;
            updateState(state);
          })

          .then(build)
          .tap(function () {
            state[version] = states.running;
            updateState(state);
          })

          .then(test)
          .tap(function () {
            state[version] = states.cleaning;
            updateState(state);
          })
          .then(clean)
          .tap(function () {
            state[version] = states.success;
            updateState(state);
          })

          .catch(function (output) {
            state[version] = states.error;
            errors[version] = output;
            updateState(state);
          })

          .then(function () {
            var tmpPath = join(path, '.' + version + '.dockerfile');
            return fs.unlink(tmpPath).catch(function () {});
          });
      })

      .then(function () {
        if (!exists) {
          return fs.unlink(join(path, '.dockerignore')).catch(function () { });
        }
      })

      .then(function () {

        logUpdate.done();

        // display output from failed node.js versions
        Object.keys(errors).forEach(function (version) {
          console.log('\n   ' + chalk.red(figures.cross + '  node v' + version + ':'));
          console.log(errors[version]);
        });

        callback(null, Object);
      });

  }catch(e){
    callback(e);
  }
};

TestRunner.prototype.emit = function(evt, data){
  return this.events.emit(evt, data);
};

TestRunner.prototype.on = function(evt, handler){
  return this.events.on(evt, handler);
};

TestRunner.prototype.offEvent = function(handle){
  return this.events.offEvent(handle);
};

module.exports = TestRunner;