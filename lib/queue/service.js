var path = require('path')
  , graceful = require('graceful-fs')
  , extra = require('fs-extra')
  , async = require('async')
  , EventEmitter = require('events').EventEmitter
  , Queue = require('file-queue').Queue
;

function Service(){
  this.state = this.STATES.uninitialised;
  this.__events = new EventEmitter();
}

Service.prototype.STATES = {
  uninitialised:0,
  listening:1,
  stopped:2,
  error:3,
  busy:4
};

Service.prototype.on = function(evt, handler){
  return this.__events.on(evt, handler);
};

Service.prototype.offEvent = function(handle){
  return this.__events.offEvent(handle);
};

Service.prototype.__emit = function(evt, message){
  return this.__events.emit(evt, message);
};

Service.prototype.error = function(e, callback){

  this.state = this.STATES.error;
  this.errors.push(e);

  this.emit('error', e);

  if (callback) return callback(e);
};


Service.prototype.__newJobId = function(){
  return Date.now() + '_' + require('uuid').v4();
};

Service.prototype.listen = function(callback){

  var _this = this;

  _this.state = _this.STATES.listening;

  _this.__queue.tpop(function(err, message, commit, rollback) {

    if (err){
      _this.services.log.error('issue with queue attach method', err);
      _this.state = _this.STATES.error;
    }

    _this.state = _this.STATES.busy;

    _this.currentJob = {

      id: _this.__newJobId(),

      message: message,

      __commit: commit,

      __rollback: rollback,

      commit:function(callback){

        this.__commit(function(e){

          if (e) return _this.error(e, callback);
          _this.listen();//start listening again
          if (callback) callback();
        });
      },

      rollback:function(callback, noListen){

        this.__rollback(function(e){

          if (e) return _this.error(e, callback);
          if (!noListen) _this.listen();//start listening again

          if (callback) callback();
        })
      }
    };

    _this.currentJob.config = {
      
    };

    _this.__emit('message-popped', _this.currentJob);
  });

  if (callback) return callback();
};

Service.prototype.start = function(callback){

  try{

    var _this = this;

    if (!_this.config.queue) _this.config.queue = {};

    if (!_this.config.queue.popInterval) _this.config.queue.popInterval = 2000;

    if (!_this.config.queue.folder) _this.config.queue.folder = path.resolve(__dirname, '../../tracey_queue_folder');

    extra.ensureDirSync(_this.config.queue.folder);

    var queue = new Queue({

      path: _this.config.queue.folder,
      fs: graceful

    }, function(e){

      if (e) return callback(e);
      Object.defineProperty(_this, '__queue', {value:queue});

      _this.listen(callback);
    });

  }catch(e){
    callback(e);
  }
};

Service.prototype.stop = function(callback){

  try{

    if (this.__queue) this.__queue.stop();

    this.__state = this.STATES.stopped;

    if (this.currentJob) return this.currentJob.rollback(callback, true)//noListen

  }catch(e){
    return callback(e);
  }

  callback();
};

Service.prototype.push = function(message, callback){

  var _this = this;

  try{

    if (_this.__queue && (_this.state == _this.STATES.listening || _this.state == _this.STATES.busy))
      _this.__queue.push(message, callback);
    else callback(new Error('queue not ready or in an error state'));

  }catch(e){
    return callback(e);
  }
};

module.exports = Service;