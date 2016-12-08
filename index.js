var service = require('./lib/service')
  , path = require('path')
  ;

service.on('info', function(){

});

service.on('test-started', function(message){

});

service.on('test-ended', function(message){

});

service.on('stopping', function(message){

});

service.on('started', function(message){

  console.log('Tracey is up and running...');
});

var config = require('./util/parse-config')(__dirname + path.sep + '.tracey.yml');

service.start(config);


