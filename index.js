var ServiceManager = require('./lib/service')
  , path = require('path')
  , commander = require('commander')
  , path = require('path')
  ;

var service = new ServiceManager();
var repo;

service.on('stopping', function(message){

});

service.on('error', function(message){

});

service.on('started', function(message){

  console.log('Tracey is up and running...');

  if (repo){
    service.services.queue.push({repo:repo});
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

var config = require('./util/parse-config')(__dirname + path.sep + '.tracey.yml');
var privateConfig;

if (username && token){

  if (!config.github) config.github = {};
  if (!config.github.api) config.github.api = {};
}
else {
  try{
    privateConfig = require('./util/parse-config')(__dirname + path.sep + 'private/config.yml');
  }catch(e){
    //do nothing
  }
}
//private overrides (tokens and the like)
if (privateConfig){

  username = privateConfig.username;
  token = privateConfig.token;
}

config.github.username = username;
config.github.token = token;

console.log('STARTING:::', JSON.stringify(config, null, 2));

service.start(config);


