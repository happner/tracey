var extra = require('fs-extra'),
    path = require('path'),
    async = require('async'),
    Utils = require('tracey-job-modules').Utils,
    Filer = Utils.Filer,
    Hasher = Utils.PackageHasher,
    Archiver = Utils.Archiver;

function Service() {
    this.__filer = new Filer();
    this.__hasher = new Hasher();
    this.__archiver = new Archiver();
}

Service.prototype.__do = function (job, callback) {

    var _this = this;

    _this.services.log.info('started job: ' + job.id, job.message.job_type);
    _this.services.log.info('event info: ' + job.id, job.event);

    console.log(job.message);

    if (job.message.job_type.path.indexOf('./lib/job_types/') == 0) {
        //an internal job type
        var filePath = job.message.job_type.path.replace('./lib/job_types/', '');
        _this.services.log.info('job filepath: ', filePath);
        job.message.job_type.path = path.resolve(__dirname, '../../../lib/job_types') + path.sep + filePath;
        _this.services.log.info('resolved job path: ', job.message.job_type.path);
    }

    var JobRunner = require(job.message.job_type.path), runner = new JobRunner(job);

    runner.on('test-progress', function (progress) {
        _this.services.log.info(progress.message);
    });

    runner.on('run-complete', function (context) {
        _this.services.log.success('run completed, results:');
        _this.services.log.success(context.test_results);
    });

    _this.services.log.info('starting runner: ' + job.id);

    runner.start(callback);
};

Service.prototype.__setupJobsFolderSync = function () {

    var self = this;

    self.services.log.info('creating jobs folder...');

    if (!self.config.job)
        self.config.job = {};

    if (!self.config.job.folder)
        self.config.job.folder = path.resolve(__dirname, '../../../tracey_job_folder');

    extra.ensureDirSync(self.config.job.folder);

    self.services.log.info('setting jobs folder permissions.. ');

    extra.chmodSync(self.config.job.folder, '0777');

    self.services.log.success('set jobs folder permissions.. ');
};

Service.prototype.__createJobFolderSync = function (job) {

    var folderName = this.config.job.folder + path.sep + job.message.repo.split('/').join(path.sep) + path.sep + job.id;

    this.services.log.info('creating job folder: ' + folderName);

    var jobPath = extra.ensureDirSync(folderName);

    this.services.log.info('setting job folder permissions for folder: ' + jobPath);

    extra.chmodSync(folderName, '0777');

    this.services.log.success('set job folder permissions.. ');

    return path.resolve(folderName);
};

Service.prototype.__removeJobFolderSync = function (job) {

    var self = this;

    self.services.log.success('removing folder for job: ' + job.id);

    extra.remove(job.message.folder, function (e) {

        if (e)
            return self.__jobBroke(job, e);

        self.services.log.success('run complete: ' + job.id);
        job.commit();
    });
};

Service.prototype.__jobBroke = function (job, err) {
    var self = this;

    self.services.log.error('failed running job with id: ' + job.id, err);
    self.services.log.error('failed running job with id: ' + job.id, err.toString());

    return job.commit();
};

Service.prototype.__setJobPopHandler = function () {

    var self = this;

    self.services.queue.on('message-popped', function (job) {

        /*
         create the job folder...
         */

        self.services.log.info('popped job: ' + job.id);
        self.services.log.info('popped job: ' + JSON.stringify(job.message.event));
        self.services.log.info('job message ', job.message.job_type);

        try {
            self.services.log.info('creating job folder..');
            job.message.folder = self.__createJobFolderSync(job);
        } catch (e) {
            return self.__jobBroke(job, new Error('folder create failed', e));
        }

        self.services.log.success('created job folder: ' + job.id);

        async.series([
            function (cb1) {
                self.services.github.cloneRepo({repo: job.message.repo, dest: job.message.folder}, function (e) {

                    if (e) {
                        self.__jobBroke(job, new Error('repo clone failed', e));
                        return cb1(e);
                    }

                    self.services.log.success('cloned repo for job: ' + job.id);
                    cb1();
                });
            },
            function (cb2) {
                self.__do(job, function (e) {

                    if (e) {
                        self.__jobBroke(job, e);
                        return cb2(e);
                    }

                    cb2();
                });
            },
            function (cb3) {
                if (job.message.config.artifact_path) {

                    self.services.log.success('creating archive for job: ' + job.id + '; from folder ' + job.message.folder + '/node_modules; to ' + job.message.config.artifact_path);

                    var pkg = self.__filer.getPackageJSON(job.message.folder);
                    var hash = self.__hasher.createPackageHash(pkg);
                    var modulesFolder = job.message.folder + '/node_modules';

                    self.__archiver.createArchive(modulesFolder, job.message.config.artifact_path, hash, function (err, result) {

                        if (err) {
                            self.__jobBroke(job, err);
                            return cb3(err);
                        }

                        try {
                            self.__removeJobFolderSync(job);
                            cb3();
                        } catch (err) {
                            self.__jobBroke(job, err);
                            return cb3(err);
                        }
                    });
                } else
                    try {
                        self.__removeJobFolderSync(job);
                        cb3();
                    } catch (err) {
                        self.__jobBroke(job, err);
                        return cb3(err);
                    }
            }
        ], function (err) {

        });
    });
};

Service.prototype.start = function (callback) {

    var self = this;

    self.__setupJobsFolderSync();
    self.__setJobPopHandler();

    callback();
};

Service.prototype.stop = function (callback) {
    callback();
};

module.exports = Service;