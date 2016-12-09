var async = require('async')
  , url = require('url')
;

function Service(){

}

Service.prototype.__createHook = function(ghRepo, repo, callback){

  var _this = this;

  _this.services.log.info('creating hook: ' + repo.hookName + ' for ' + repo.owner + '/' + repo.name);

  // var hookMessage = {
  //
  //   repo:repo.name,
  //   owner:repo.owner,
  //   name:repo.hookName,
  //   active:true,
  //   documentation_url: _this.config.host + '/docs' + '?secret=' + repo.secret,
  //   config:{
  //     url: _this.config.host + '/hooks' + '?secret=' + repo.secret
  //   }
  // };

  ghRepo.hook({
    "name": "web",
    "active": true,
    "events": ["push", "pull_request"],
    "config": {
      "url": _this.config.url,
      "secret": _this.config.secret
    }
  }, function(e, response){

    /*
     {
     "type": "Repository",
     "id": 11084307,
     "name": "web",
     "active": true,
     "events": [
     "push",
     "pull_request"
     ],
     "config": {
     "url": "http://heathendigital.com",
     "secret": "********",
     "insecure_ssl": 1
     },
     "updated_at": "2016-12-09T12:48:23Z",
     "created_at": "2016-12-09T12:48:23Z",
     "url": "https://api.github.com/repos/happner/tracey/hooks/11084307",
     "test_url": "https://api.github.com/repos/happner/tracey/hooks/11084307/test",
     "ping_url": "https://api.github.com/repos/happner/tracey/hooks/11084307/pings",
     "last_response": {
     "code": null,
     "status": "unused",
     "message": null
     }
     }
     */

    if (e) {
      _this.services.log.error('bad trick, Tracey was unable to hook', e);
      return callback(e);
    }

    _this.services.log.error('hook created ok');
    callback(null, response);
  }); // hook
};

Service.prototype.__handleGithubEvent = function(event, type, data){

  var _this = this;

  _this.services.log.success('github event happened, event obj:::', JSON.stringify(event));
  _this.services.log.success('github event happened, type obj:::', JSON.stringify(type));
  _this.services.log.success('github event happened, data obj:::', JSON.stringify(data));

  _this.services.queue.push();
};

Service.prototype.__activateWebHooks = function(callback){

  var _this = this;

  if (!_this.config.repos || _this.config.repos.length == 0) return callback('Tracey needs at least 1 repo configured in.tracey.yml to be of any use...');

  async.eachSeries(_this.config.repos, function(repo, repoCB){

    if (!repo.owner || !repo.name || !repo.secret) return repoCB(new Error('repo must be configured with an owner and a name and a shared secret'))

    _this.services.log.info('checking hooks for repo: ', repo);

    var ghRepo = _this.__github.repo(repo.owner + '/' + repo.name);

    ghRepo.hooks(function(e, hooks){

      /*

       [
         {
         "type": "Repository",
         "id": 11084096,
         "name": "web",
         "active": true,
         "events": [
           "pull_request",
           "push"
          ],
         "config": {
           "url": "http://heathendigital.com/hooks?secret=YYTAAG4562fDSsa"
          },
         "updated_at": "2016-12-09T12:31:17Z",
         "created_at": "2016-12-09T12:31:17Z",
         "url": "https://api.github.com/repos/happner/tracey/hooks/11084096",
         "test_url": "https://api.github.com/repos/happner/tracey/hooks/11084096/test",
         "ping_url": "https://api.github.com/repos/happner/tracey/hooks/11084096/pings",
         "last_response": {
           "code": 422,
           "status": "misconfigured",
           "message": "Invalid HTTP Response: 307"
           }
         }
       ]
       */

      if (e) {

        _this.services.log.error('hooks fetch failed for repo ' + repo.name, e);
        return repoCB(e);
      }

      _this.services.log.success('have hooks', hooks);

      var found = false;

      hooks.every(function(hook){

        _this.services.log.info('matching hook', hook);

        if (hook.config.url == _this.config.url &&
            hook.events.indexOf('push') > -1 &&
            hook.events.indexOf('pull_request') > -1)
          found = true;

        return found;
      });

      if (!found)  _this.__createHook(ghRepo, repo, repoCB);
      else repoCB();
    })
  }, function(e){

    var githubhook = require('githubhook');

    var url = require('url').parse(_this.config.url);

    var github = githubhook({

      port:url.port,
      path:url.pathname,
      secret:_this.config.secret
    });

    github.on('*', _this.__handleGithubEvent.bind(_this));

    github.listen();

    callback();
  });
};

Service.prototype.start = function(callback){

  try{

    if (!this.config.github) this.config.github = {};

    if (!this.config.github.debug) this.config.github.debug = false;

    if (!this.config.github.protocol) this.config.github.protocol = 'https';

    if (!this.config.github.host) this.config.github.host = 'api.github.com';

    if (!this.config.github.pathPrefix) this.config.github.pathPrefix = '/api/v3';

    if (!this.config.github.headers) this.config.github.headers = {};

    if (!this.config.github.headers['user-agent']) this.config.github.headers['user-agent'] = 'Happner Tracey ' + require('uuid').v4();

    if (!this.config.github.Promise) this.config.github.Promise = 'bluebird';

    var promiseLib;

    if (this.config.github.Promise.substring) promiseLib = require(this.config.github.Promise);
    else promiseLib = this.config.github.Promise;

    if (!this.config.github.followRedirects) this.config.github.followRedirects = false;

    if (!this.config.github.timeout) this.config.github.timeout = 5000;

    // var githubConfig = {
    //   // optional
    //   debug: this.config.github.debug,
    //   protocol: this.config.github.protocol,
    //   host: this.config.github.host, // should be api.github.com for GitHub
    //   pathPrefix: this.config.github.pathPrefix, // for some GHEs; none for GitHub
    //   headers: this.config.github.headers,
    //   Promise: promiseLib,
    //   followRedirects: this.config.github.followRedirects, // default: true; there's currently an issue with non-get redirects, so allow ability to disable follow-redirects
    //   timeout: this.config.github.timeout
    // };

    var github = require('octonode');

    //this.services.log.info('github API config: ', githubConfig);

    //this.__github = new GitHubApi(githubConfig);

    this.__github = github.client(this.config.github.token);

    this.__activateWebHooks(callback);

  }catch(e){
    callback(e);
  }
};

Service.prototype.stop = function(callback){

  callback();
};

module.exports = Service;