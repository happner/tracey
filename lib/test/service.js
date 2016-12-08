function Service(){

}

Service.prototype.start = function(callback){
	callback();
}

Service.prototype.stop = function(callback){
	callback();
}

module.exports = Service;