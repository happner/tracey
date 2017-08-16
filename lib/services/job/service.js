var extra = require('fs-extra'),
    path = require('path'),
    async = require('async');

function Service() {
}

Service.prototype.start = function (callback) {

    var self = this;

    self.__setupJobsFolderSync();
    self.__setJobPopHandler();

    callback();
};

Service.prototype.stop = function (callback) {
    callback();
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
            function (cb2) {    // get the artifact from IPFS if it exists

                if (job.message.config.artifacts) {

                    self.__resolveArtifact(job, function (err, result) {

                        if (err)
                            return cb2();

                        job.message.npmInstall = result == null; // this is used by the job itself to initiate an npm install

                        cb2();
                    });
                } else {
                    job.message.npmInstall = true;
                    cb2();
                }
            },
            function (cb3) {    // do the actual job
                self.__do(job, function (e) {

                    if (e) {
                        self.__jobBroke(job, e);
                        return cb3(e);
                    }

                    cb3();
                });
            },
            function (cb4) {    // generate archive and upload to IPFS

                if (job.message.config.artifacts) {

                    console.log('::: GENERATING ARTIFACTS AND UPLOADING...');

                    self.__generateAndUploadArtifact(job, function (err) {
                        if (err)
                            return cb4(err);

                        cb4();
                    })
                } else
                    cb4();
            }
            //function (cb5) {    // push updated index file to Github
            //    if (job.message.config.artifacts.upload) {
            //
            //        self.services.artifact.generate(job, function (err, result) {
            //            if (err) {
            //                self.__jobBroke(job, err);
            //                return cb5(err);
            //            }
            //
            //            cb5();
            //        });
            //    } else
            //        cb5();
            //}
        ], function (err) {

            if (err)
                self.__jobBroke(job, err);

            try {
                self.__removeJobFolderSync(job);
            } catch (err) {
                self.__jobBroke(job, err);
            }
        });
    });
};

Service.prototype.__do = function (job, callback) {

    var _this = this;

    _this.services.log.info('started job: ' + job.id, job.message.job_type);
    _this.services.log.info('event info: ' + job.id, job.event);

    //console.log(job.message);

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

Service.prototype.__resolveArtifact = function (job, callback) {

    var self = this;
    var artifactAddress = self.services.artifact.getIpfsArtifactAddress(job);

    if (artifactAddress != null) {    // get the dependency from IPFS

        var downloadFolder = path.join(path.resolve('./temp'));
        var modulesFolder = path.join(path.resolve(job.message.folder), 'node_modules');
        var ipfsConfig = job.message.config.artifacts;

        self.services.ipfs.download(ipfsConfig, artifactAddress, downloadFolder, function (err, result) {

            if (err)
                return callback(err);

            self.services.artifact.unarchive(downloadFolder, modulesFolder, function (err, result) {

                if (err)
                    return callback(err);

                self.__requireNpmInstall = false;

                return callback(null, artifactAddress);
            });
        });
    }

    callback(null, null);
};

Service.prototype.__generateAndUploadArtifact = function (job, callback) {

    var self = this;

    // generate artifact
    self.services.artifact.generate(job, function (err, tarballName) {

        if (err) {
            self.__jobBroke(job, err);
            return callback(err);
        }

        // upload to IPFS
        var tarPath = path.join(path.resolve(job.message.config.artifacts.folder), tarballName);
        var ipfsConfig = job.message.config.artifacts;

        self.services.ipfs.upload(ipfsConfig, tarPath, function (err, ipfsKey) {

            if (err)
                return callback(err);

            // update local hash index file
            var hashFilePath = path.resolve(job.message.config.artifacts.index);
            var lineItem = tarballName.substr(0, tarballName.indexOf('.')) + ':' + ipfsKey;
            console.log(':: LINE ENTRY: ', lineItem);

            self.services.artifact.updateArtifactHashFile(hashFilePath, lineItem, function (err, result) {
                if (err)
                    return callback(err);

                return callback();
            });
        });
    });
};

module.exports = Service;