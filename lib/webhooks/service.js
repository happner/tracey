function Service(){

}

Service.prototype.start = function(callback){

  var githubhook = require('githubhook');
  var github = githubhook({/* options */});

  github.listen();

  callback();
};

Service.prototype.stop = function(callback){
  callback();
};

module.exports = Service;