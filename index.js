var service = require('./lib/service');

service.on('info', function(){

});

service.on('test-started', function(message){

});

service.on('test-ended', function(message){

});

service.on('stopping', function(message){

});

service.start();


