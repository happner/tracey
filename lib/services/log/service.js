var chalk = require('chalk')

function Service(){

}

Service.prototype.LOGTYPE = {
  INFO:0,
  WARN:1,
  ERROR:2,
  SUCCESS:3
};

Service.prototype.write = function(message, type, data){

  var logData = '';

  if (data != null){
    try{
      logData = JSON.stringify(data, null, 2);
    }catch(e){
      //if it cannot be serialised, it cannot be viewed
    }
  }

  switch(type) {

    case this.LOGTYPE.WARN:
      console.log(chalk.yellow(message), logData);
      break;
    case this.LOGTYPE.ERROR:
      console.log(chalk.red(message), logData);
      break;
    case this.LOGTYPE.SUCCESS:
      console.log(chalk.green(message), logData);
      break;
    default: console.log(chalk.blue(message), logData);

  }
};

Service.prototype.error = function(message, data){
  this.write(message, this.LOGTYPE.ERROR, data);
};

Service.prototype.info = function(message, data){
  this.write(message, this.LOGTYPE.INFO, data);
};

Service.prototype.success = function(message, data){
  this.write(message, this.LOGTYPE.SUCCESS, data);
};

Service.prototype.warn = function(message, data){
  this.write(message, this.LOGTYPE.WARN, data);
};

Service.prototype.start = function(callback){

  callback();
};

Service.prototype.stop = function(callback){

  callback();
};

module.exports = Service;