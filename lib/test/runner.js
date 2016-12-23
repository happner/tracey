
var fs = require('fs-extra')
  , path = require('path')
  , EventEmitter = require('events').EventEmitter
  , util = require('util')
  , Promise = require('bluebird')
  , logUpdate = require('log-update')
  , figures = require('figures')
  , chalk = require('chalk')
  , join = require('path').join
  , updateState = require('./update-state')
  , getVersions = require('./get-versions')
  , pullImage = require('./pull-image')
  , states = require('./states')
  , clean = require('./clean')
  , build = require('./build')
  , copy = require('./util/copy')
  , stat = require('./util/stat')
  , test = require('./test')
  , async = require('async')
;

function TestRunner(job){

  this.events = new EventEmitter();

  Object.defineProperty(this, 'job', {value:job});

  // this.job = job;
  //
  // this.repo = job.message.repo;
  // this.folder = job.folder;
  // this.config = job.message.config;
}

TestRunner.prototype.__updateState = function(state, message, context){
  updateState(state);
  this.__emit('test-progress', {state:state, message:message, context:context});
};

TestRunner.prototype.start = function(callback){

  try{

    var _this = this;

    var repo = _this.job.message.repo;
    var folder = _this.job.message.folder;
    var config = _this.job.message.config;

    _this.__emit('info', 'starting runner, repo: ' + repo);

    if (!stat(join(folder, 'package.json'))) return callback('package.json does not exist in the current directory');

    var pkg = require(join(folder, 'package.json'));

    // if there's no .dockerignore
    // copy .gitignore to .dockerignore
    var exists = stat(join(folder, '.dockerignore'));

    if (!exists) copy(join(folder, '.gitignore'), join(folder, '.dockerignore'));

    var state = {};

    var errors = {};

    var versions = getVersions(config);

    async.eachSeries(versions, function(version, versionCB){

      var context = {
        version: version,
        name: pkg.name.toLowerCase(),
        path: folder,
        test_script: _this.job.message.config.test_script
      };

      return Promise.resolve(context)
        .tap(function () {
          state[version] = states.downloading;
          _this.__updateState(state, 'downloading docker image', context);
        })

        .then(pullImage)
        .tap(function () {

          state[version] = states.building;
          _this.__updateState(state, 'building container', context);
        })

        .then(build)
        .tap(function () {

          state[version] = states.running;
          _this.__updateState(state, 'running tests', context);
        })

        .then(test)
        .tap(function () {

          state[version] = states.cleaning;
          _this.__updateState(state, 'tests completed, cleaning up', context);
        })
        .then(clean)
        .tap(function () {

          state[version] = states.success;
          _this.__updateState(state, 'run successful', context);

          console.log('RUN COMPLETE:::');
          console.log(context.test_results);

          _this.__emit('run-complete', context.test_results);

          versionCB();
        })
        .catch(function (output) {

          state[version] = states.error;

          errors[version] = output;

          _this.__updateState(state, 'run failed', context);

          versionCB(output);
        })
        .finally(function () {

          try{

            var tmpPath = join(context.path, '.' + version + '.dockerfile');

            try{ fs.unlinkSync(tmpPath); }catch(e){}
          }catch(e){}
        });

    }, function(e){

      if (e) return callback(e);

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

TestRunner.prototype.__emit = function(evt, data){
  return this.events.emit(evt, data);
};

TestRunner.prototype.on = function(evt, handler){
  return this.events.on(evt, handler);
};

TestRunner.prototype.offEvent = function(handle){
  return this.events.offEvent(handle);
};

module.exports = TestRunner;