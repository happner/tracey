var ServiceManager = require('./lib/services/service')
  , path = require('path')
  , commander = require('commander')
  ;

var service = new ServiceManager();

var repo;

service.on('stopping', function(message){

});

service.on('error', function(message){

});

service.on('started', function(message){

  service.services.log.success('tracey up and running..');

  if (repo){

    var owner = repo.split('/')[0];
    var name = repo.split('/')[1];
    var branch = 'master';

    var initialJob = {repo:repo, event:{owner:owner, name:name, branch:branch}};

    console.log('about to queue:::', initialJob);

    service.services.queue.push(initialJob, function(e){

      if (e) return service.services.log.error('failed to push initial repo to queue', e);

      return service.services.log.success('initial repo job pushed to queue');
    });
  }
});

commander

  .version(JSON.parse(require('fs').readFileSync(__dirname + path.sep + 'package.json')).version)
  .option("-u, --username <val>", "github username")
  .option("-t, --token <val>", "github token")
  .option("-r, --repo <val>", "initial run")

  .parse(process.argv);

var username = commander.option('u').username;

var token = commander.option('t').token;

repo = commander.option('r').repo;

var config = require('./lib/util/parse-config')(__dirname + path.sep + '.tracey.yml');

console.log(config);

if (!config.github) config.github = {};

var privateConfig;

try{
  privateConfig = require('./lib/util/parse-config')(__dirname + path.sep + 'private/config.yml');
}catch(e){
  //do nothing
}

//private overrides (tokens and the like)
if (privateConfig) config = require('merge').recursive(config, privateConfig);

service.start(config);


