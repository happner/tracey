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

                var gitConfig = {
                    user: self.config.github.user,
                    repo: 'https://github.com/' + job.message.repo + '.git',
                    dest: job.message.folder
                };
                self.services.github.cloneRepo(gitConfig, function (err) {

                    if (err) {
                        self.__jobBroke(job, new Error('repo clone failed', err));
                        return cb1(err);
                    }

                    self.services.log.success('cloned repo for job: ' + job.id);
                    cb1();
                });
            },
            function (cb2) {    // get the artifact from IPFS if it exists

                if (job.message.config.artifacts) {

                    self.__resolveArtifact(job, function (err, result) {

                        if (err) {
                            self.__jobBroke(job, err);
                            return cb2();
                        }

                        job.message.npmInstall = result == null; // this is used by the job itself to initiate an npm install

                        cb2();
                    });
                } else {
                    job.message.npmInstall = true;
                    cb2();
                }
            },
            function (cb3) {    // do the actual job
                self.__do(job, function (err) {

                    if (err) {
                        self.__jobBroke(job, err);
                        return cb3(err);
                    }

                    cb3();
                });
            },
            function (cb4) {    // generate archive and upload to IPFS

                if ((job.message.config.artifacts != null) && job.message.npmInstall) {

                    self.services.log.info('--> generating artifacts and uploading...');

                    self.__generateAndUploadArtifact(job, function (err) {
                        if (err) {
                            self.__jobBroke(job, err);
                            return cb4(err);
                        }

                        cb4();
                    })
                } else {
                    self.services.log.info('--> artifact found! ...skipping artifact generation and IPFS upload...');
                    cb4();
                }
            },
            function (cb5) {    // push updated index file to Github
                if (job.message.config.artifacts.upload && job.message.npmInstall) {

                    var artifactHashFile = path.join(job.message.folder, job.message.config.artifacts.index);

                    self.services.log.info('--> committing and pushing to Github...');

                    self.services.github.commitAndPush({
                        repo: job.message.repo,
                        dest: job.message.folder
                    }, artifactHashFile, function (err, result) {
                        if (err) {
                            self.__jobBroke(job, err);
                            return cb5(err);
                        }

                        cb5();
                    });
                } else {
                    self.services.log.info('--> skipping Github commit & push...');
                    cb5();
                }
            }
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

    var self = this;

    self.services.log.info('started job: ' + job.id, job.message.job_type);
    self.services.log.info('event info: ' + job.id, job.event);

    if (job.message.job_type.path.indexOf('./lib/job_types/') == 0) {
        //an internal job type
        var filePath = job.message.job_type.path.replace('./lib/job_types/', '');
        self.services.log.info('job filepath: ', filePath);
        job.message.job_type.path = path.resolve(__dirname, '../../../lib/job_types') + path.sep + filePath;
        self.services.log.info('resolved job path: ', job.message.job_type.path);
    }

    var JobRunner = require(job.message.job_type.path), runner = new JobRunner(job);

    runner.on('test-progress', function (progress) {
        self.services.log.info(progress.message);
    });

    runner.on('run-complete', function (context) {
        self.services.log.success('run completed, results:');
        self.services.log.success(context.test_results);
    });

    self.services.log.info('starting runner: ' + job.id);

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

    self.services.artifact.getIpfsArtifactAddress(job, function (err, artifactAddress) {

        if (err)
            return callback(err);

        if (artifactAddress != null) {    // get the dependency from IPFS

            self.services.log.info('--> found artifact with IPFS key: ', artifactAddress);

            var downloadFolder = path.join(path.resolve('./temp'));
            var modulesFolder = path.join(path.resolve(job.message.folder), 'node_modules');
            var ipfsConfig = job.message.config.artifacts;

            self.services.ipfs.download(ipfsConfig, artifactAddress, downloadFolder, function (err) {

                if (err)
                    return callback(err);

                self.services.artifact.unarchive(downloadFolder, modulesFolder, function (err) {

                    if (err)
                        return callback(err);

                    callback(null, artifactAddress);
                });
            });
        } else
            callback();
    });
};

Service.prototype.__generateAndUploadArtifact = function (job, callback) {

    var self = this;

    // generate artifact
    self.services.artifact.generate(job, function (err, tarballName) {

        if (err)
            return callback(err);

        var tarPath = path.join(path.resolve(job.message.config.artifacts.folder), tarballName);
        var ipfsConfig = job.message.config.artifacts;

        self.services.log.info('--> uploading to IPFS...');

        // upload to IPFS
        self.services.ipfs.upload(ipfsConfig, tarPath, function (err, ipfsKey) {

            if (err)
                return callback(err);

            var hashFilePath = path.join(job.message.folder, job.message.config.artifacts.index);
            var lineItem = tarballName.substr(0, tarballName.indexOf('.')) + ':' + ipfsKey;

            self.services.log.info('--> adding line entry: ', lineItem, 'to ', hashFilePath);

            // update local hash index file
            self.services.artifact.updateArtifactHashFile(hashFilePath, lineItem, function (err) {

                if (err)
                    return callback(err);

                callback();
            });
        });
    });
};

module.exports = Service;