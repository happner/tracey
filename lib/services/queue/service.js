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

Service.prototype.removeListener = function(evt, handler){
  return this.__events.removeListener(evt, handler);
};

Service.prototype.__emit = function(evt, message){

  //this.services.log.info('queue emitting event: ' + evt, message);
  //console.log('queue emitting __events: ', this.__events);

  return this.__events.emit(evt, message);
};

Service.prototype.error = function(e, callback){

  this.errors.push(e);

  this.__emit('error', e);

  if (callback) return callback(e);
};


Service.prototype.__newJobId = function(){
  return Date.now() + '_' + require('uuid').v4();
};

Service.prototype.listen = function(callback){

  var _this = this;

  _this.state = _this.STATES.listening;

  _this.__queue.tpop(function(err, serializedMessage, commit, rollback) {

    if (err){

      _this.services.log.error('issue with queue pop ' + err.toString());
      _this.__emit('error', err);
      commit();
    }

    var message = JSON.parse(serializedMessage);

    _this.services.log.info('popped a message off the queue', message);

    _this.state = _this.STATES.busy;

    _this.currentJob = {

      id: _this.__newJobId(),
      message: message
    };

    Object.defineProperty(_this.currentJob, 'rollback', {

      value:function(callback, noListen){

        this.__rollback(function(e){

          if (e) return _this.error(e, callback);

          if (!noListen) _this.listen();//start listening again

          if (callback) callback();
        })
      }.bind({job:_this.currentJob, __rollback:rollback})
    });

    Object.defineProperty(_this.currentJob, 'commit', {

      value:function(callback){

        this.__commit(function(e){

          if (e) return _this.error(e, callback);

          _this.listen();//start listening again

          if (callback) callback();
        });
      }.bind({job:_this.currentJob, __commit:commit})
    });

    _this.config.repos.every(function(repo){

      var repoFound = (message.repo == repo.owner + '/' + repo.name);

      if (repoFound) {

        _this.currentJob.message.config = repo;

        _this.config.job_types.forEach(function(jobType){

          if (jobType.name === repo.job_type) {
            _this.currentJob.message.job_type = jobType;
          }
        });
      }

      return !repoFound;
    });

    if (!_this.currentJob.message.config) {

      _this.__emit('error', new Error('no configuration found for repo: ' + message.repo));

      return _this.currentJob.commit();
    }

    if (!_this.currentJob.message.job_type) {

      _this.__emit('error', new Error('job type' + _this.currentJob.message.config.job_type + ' not found for repo: ' + message.repo));

      return _this.currentJob.commit();
    }

    _this.services.log.info('job created and about to be emitted, id: ' + _this.currentJob.id);

    _this.__emit('message-popped', _this.currentJob);
  });

  if (callback) return callback();
};

Service.prototype.start = function(callback){

  try{

    var _this = this;

    if (!_this.config.queue) _this.config.queue = {};

    if (!_this.config.queue.popInterval) _this.config.queue.popInterval = 2000;

    if (!_this.config.queue.folder) _this.config.queue.folder = path.resolve(__dirname, '../../../tracey_queue_folder');

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

    if (this.currentJob) return this.currentJob.rollback(callback, true);//noListen

  }catch(e){
    return callback(e);
  }

  callback();
};

Service.prototype.push = function(message, callback){

  var _this = this;

  try{

    var serialisedMessage = JSON.stringify(message, null, 2);

    _this.services.log.info('pushing message into queue: ' + serialisedMessage);

    if (_this.__queue && (_this.state == _this.STATES.listening || _this.state == _this.STATES.busy))
      _this.__queue.push(serialisedMessage, callback);
    else callback(new Error('queue not ready or in an error state'));

  }catch(e){
    return callback(e);
  }
};

module.exports = Service;