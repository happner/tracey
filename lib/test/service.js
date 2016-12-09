var  extra = require('fs-extra')
	, path = require('path')
;

function Service(){

}

Service.prototype.__createFolder = function(job){

	var folderName = this.config.job.folder + path.sep + job.message.repo.split('/').join(path.sep) + path.sep + job.id;

	this.services.log.info('creating job folder: ' + folderName);

	extra.ensureDirSync(folderName);

	return folderName;
};

Service.prototype.__do = function(job, callback){

	this.services.log.info('started test job: ' + job.id);

	var TestRunner = require('./runner'),
		runner = new TestRunner(job);

	runner.start(callback);
};

Service.prototype.start = function(callback){

	var _this = this;

	if (!_this.config.job) _this.config.job = {};

	if (!_this.config.job.folder) _this.config.job.folder = path.resolve(__dirname, '../../tracey_job_folder');

	extra.ensureDirSync(_this.config.job.folder);

	_this.services.queue.on('message-popped', function(job){

		var jobBroke = function(e){
			_this.services.log.error('failed running job with id: ' + job.id, e);
			return job.rollback();
		};

		try{
			job.folder = _this.__createFolder(job);
		}catch(e){
			return jobBroke(e);
		}

		_this.services.github.cloneRepo({repo:job.message.repo, dest:job.folder}, function(e){

			if (e) return jobBroke(e);

			_this.__do (job, function(e){

				if (e)return jobBroke(e);

				job.commit();
			});
		});
	});

	callback();
};

Service.prototype.stop = function(callback){
	callback();
};

module.exports = Service;