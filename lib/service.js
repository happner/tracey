var EventEmitter = require('events').EventEmitter,
  async = require('async')
;

module.exports = {

  events: new EventEmitter(),

  emit : function(evt, data){
    return this.events.emit(evt, data);
  },

  on : function(evt, handler){
  return this.events.on(evt, handler);
  },

  offEvent : function(handle){
    return this.events.offEvent(handle);
  },

  undoLock:function(callback){
    callback();
  },

  checkLock:function(callback){
    callback();
  },

  startServices:function(config, callback){

    var _this = this;

    _this.config = config;
    _this.services = {};

    async.eachSeries(['queue', 'test', 'webhooks'], function(serviceName, serviceCB){

      var Service = require('./' + serviceName + '/service.js');
      var instance = new Service();

      instance.services = _this.services;
      instance.config = _this.config;

      instance.start(function(e){

        if (e) return serviceCB(e);

        _this.services[serviceName] = instance;

        console.log('started service: ' + serviceName);

        serviceCB();

      });

    }, callback);
  },

  stopServices:function(callback){

    var _this = this;

    async.eachSeries(['webhooks', 'test', 'queue'], function(serviceName, serviceCB){

      var instance = _this.services[serviceName];

      if (instance) return instance.stop(serviceCB);

      serviceCB();

    }, callback);
  },

  stop:function(){

    _this.undoLock(function(e){

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
  },

  start:function(config){

    var _this = this;

    process.on('exit', _this.stop);

    _this.checkLock(function(e){

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
  }
};