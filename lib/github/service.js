var async = require('async')
  , url = require('url')
  , gitclone = require('gitclone')
  , Thompson = require('thompson')
;

function Service(){

}

Service.prototype.cloneRepo = function(opts, callback){

  //TODO: cache previous fetches

  var _this = this;

  var repo = opts.repo;

  if (!opts.repo) return callback(new Error('"repo" parameter missing'));

  if (!opts.dest) return callback(new Error('"dest" parameter missing'));

  if (_this.config.github.token) repo = 'x-access-token:' + _this.config.github.token + '@github.com/' + repo;

  gitclone(repo, { dest: opts.dest }, function(e){

    if (e) _this.services.log.error('error cloning repo ' + repo + ' into ' + opts.dest, e);

    callback(e);
  });
};

Service.prototype.__handleGithubEvent = function(message){

  var _this = this;

  //message in format:
  // {
  //   event:"[push/pull_request]",
  //     name:"[name of repo, sans owner]",
  //   owner:"{owner name}",
  //   branch: "master??",
  //   detail:"[push detail]"
  // };

  _this.services.log.success('github event happened, repo:::' + message.name);
  _this.services.log.success('github event happened, event:::' + message.event);

  if (message.event == "test") {
    _this.services.log.info('just a test message, not queueing job');
    return;
  }

  _this.services.queue.push({
    repo:message.owner + '/' + message.name,
    event:message
  }, function(e){

    _this.services.log.error('bad trick, Tracey was unable to push a job event to the queue', e);
  });
};

Service.prototype.__activateWebHooks = function(callback){

  var _this = this;

  if (!_this.config.repos || _this.config.repos.length == 0) return callback('Tracey needs at least 1 repo configured in.tracey.yml to be of any use...');

  var added = {};

  _this.config.repos.forEach(function(repo){

    var repoFullname = repo.owner + '/' +  repo.name;

    if (added[repoFullname]) {
      _this.services.log.warn('duplicate repo configured, ' + repoFullname + ' using the first one found');
      return;
    }

    added[repoFullname] = repo;

    _this.__thompson.addRepo({
      name: repoFullname,
      events:repo.events?repo.events : ['push', 'pull_request']
    })
  });

  _this.__thompson.on('webhook-event', _this.__handleGithubEvent.bind(_this));

  console.log('listening start:');

  _this.__thompson.listen()

    .then(function(){
      _this.services.log.success('listening for event(s) on url ' + url);
      callback();
    })
    .catch(function(e){
      _this.services.log.error('oh dear olde chap, thompson failed to initialize!', e);
      callback(e);
    });
};

Service.prototype.start = function(callback){

  try{

    var options = {
      "url": this.config.url,
      "token": this.config.github.token,
      "secret": this.config.github.secret,
      "host": this.config.host?this.config.host:"0.0.0.0"
    };

    this.__thompson = new Thompson(options);
    this.__activateWebHooks(callback);

  }catch(e){
    callback(e);
  }
};

Service.prototype.stop = function(callback){

  //exit not there yet, but I want to add it
  if (this.__thompson && this.__thompson.exit) return this.__thompson.exit(callback);

  callback();
};

module.exports = Service;