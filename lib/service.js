var EventEmitter = require('events').EventEmitter,
  async = require('async')
;

function ServiceManager(){

  this.__events = new EventEmitter();
}

ServiceManager.prototype.emit = function(evt, data){

  return this.__events.emit(evt, data);
};

ServiceManager.prototype.on = function(evt, handler){

  return this.__events.on(evt, handler);
};

ServiceManager.prototype.removeListener = function(evt, handler){
  return this.__events.removeListener(evt, handler);
};

ServiceManager.prototype.__undoLock = function(callback){

  callback();
};

ServiceManager.prototype.__checkLock = function(callback){

  callback();
};

ServiceManager.prototype.startServices = function(config, callback){

  var _this = this;

  _this.config = config;
  _this.services = {};

  async.eachSeries(['log', 'queue', 'test', 'github'], function(serviceName, serviceCB){

    var Service = require('./' + serviceName + '/service.js');
    var instance = new Service();

    Object.defineProperty(instance, 'services', {value:_this.services});
    Object.defineProperty(instance, 'config', {value:_this.config});

    instance.start(function(e){

      if (e) return serviceCB(e);

      _this.services[serviceName] = instance;

      console.log('started service: ' + serviceName);

      serviceCB();

    });

  }, callback);
};

ServiceManager.prototype.stopServices = function(callback){

  var _this = this;

  async.eachSeries(['github', 'test', 'queue', 'log'], function(serviceName, serviceCB){

    var instance = _this.services[serviceName];

    if (instance) return instance.stop(serviceCB);

    serviceCB();

  }, callback);
};

ServiceManager.prototype.stop = function(){

  var _this = this;

  console.log('stop:::', _this);

  _this.__undoLock(function(e){

    if (e) console.warn('unable to undo singleton file lock, please clear "/tmp/tracey/lock" of any files');

    _this.stopServices(function(e){

      if (e) {
        console.log('unable to stop services: ' + e);
        return process.exit(1)
      }

      console.log('services stopped... thanks for using Tracey');
      process.exit(0);

    });
  });
};

ServiceManager.prototype.start = function(config){

  var _this = this;

  //process.on('exit', _this.stop.bind(_this));

  _this.__checkLock(function(e){

    if (e) {
      console.log('there can be only one Tracey...');
      process.exit(1)
    }

    _this.startServices(config, function(e){

      if (e) {
        console.log('Tracey is messed up and needs help: ' + e);
        return process.exit(1)
      }

      _this.emit('started', config);

    });
  });
};

module.exports = ServiceManager;