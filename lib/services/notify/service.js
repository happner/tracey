function Service(){

}

Service.prototype.notify = function(message, group, callback){

  if (typeof group == 'function' || group == null){

  }

};

Service.prototype.start = function(callback){

  callback();
};

Service.prototype.stop = function(callback){

  callback();
};

module.exports = Service;