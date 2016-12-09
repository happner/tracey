function Service(){

}

Service.prototype.__do = function(job, callback){

	_this.services.log.info('started test job: ' + job.id);

	callback();
};

Service.prototype.start = function(callback){

	var _this = this;

	_this.services.queue.on('message-popped', function(job){

		_this.__currentJob = job;

		_this.__do(job, function(e){

			if (e){
				_this.services.log.error('failed running job with id: ' + job.id, e);
				job.rollback();
			}
			job.commit();
		});
	});

	callback();
};

Service.prototype.stop = function(callback){
	callback();
};

module.exports = Service;