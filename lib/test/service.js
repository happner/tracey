var  extra = require('fs-extra')
	, path = require('path')
;

function Service(){

}

Service.prototype.__createFolder = function(job){

	var folderName = this.config.job.folder + path.sep + job.message.repo.split('/').join(path.sep) + path.sep + job.id;

	this.services.log.info('creating job folder: ' + folderName);

	var path = extra.ensureDirSync(folderName);

	this.services.log.info('setting job folder permissions.. ');

	//ensure we open this folder up
	extra.chmodSync(path, 777);

	this.services.log.success('set job folder permissions.. ');

	return path;

};

Service.prototype.__do = function(job, callback){

	var _this = this;

	_this.services.log.info('started test job: ' + job.id);

	var TestRunner = require('./runner'), runner = new TestRunner(job);

	runner.on('test-progress', function(progress){

		_this.services.log.info(progress.message);

	});

	runner.on('run-complete', function(context){

		_this.services.log.success('run completed, results:');
		_this.services.log.success(context.test_results);

	});

	runner.start(callback);
};

Service.prototype.start = function(callback){

	var _this = this;

	if (!_this.config.job) _this.config.job = {};

	if (!_this.config.job.folder) _this.config.job.folder = path.resolve(__dirname, '../../tracey_job_folder');

	extra.ensureDirSync(_this.config.job.folder);

	_this.services.log.info('setting jobs folder permissions.. ');

	//ensure we open this folder up
	extra.chmodSync(_this.config.job.folder, 777);

	_this.services.log.success('set jobs folder permissions.. ');

	_this.services.queue.on('message-popped', function(job){

		_this.services.log.info('popped job: ' + job.id);

		var jobBroke = function(e){
			_this.services.log.error('failed running job with id: ' + job.id, e);
			return job.commit();
		};

		try{
			job.message.folder = _this.__createFolder(job);
		}catch(e){
			return jobBroke(new Error('folder create failed', e));
		}

		_this.services.log.success('created job folder: ' + job.id);

		_this.services.github.cloneRepo({repo:job.message.repo, dest:job.message.folder}, function(e){

			if (e) return jobBroke(new Error('repo clone failed', e));

			_this.services.log.success('cloned repo for job: ' + job.id);

			_this.__do (job, function(e){

				if (e) return jobBroke(e);

				_this.services.log.success('run complete: ' + job.id);

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