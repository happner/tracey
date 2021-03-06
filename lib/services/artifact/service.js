module.exports = Service;

var path = require('path');

var Utils = require('tracey-job-modules').Utils;
var Archiver = Utils.Archiver;
var Filer = Utils.Filer;
var Hasher = Utils.PackageHasher;

function Service() {
}

Service.prototype.getIpfsArtifactAddress = function (job, callback) {

    var self = this;

    var hash = this.__generateDependencyHash(job);
    var artifactHashFile = path.join(job.message.folder, self.config.artifacts.index);

    this.__filer.lookupDependencyHash(artifactHashFile, hash, function (err, result) {

        if (err)
            return callback(err);

        callback(null, result);
    });
};

Service.prototype.updateArtifactHashFile = function (filePath, lineItem, callback) {

    var self = this;

    self.__filer.addLineToFile(filePath, lineItem + '\r\n', function (err, result) {

        if (err) {
            self.services.log.error(err);
            return callback(err);
        }

        self.services.log.info('--> successfully updated artifact_hashes.txt');

        callback();
    })
};

Service.prototype.generate = function (job, callback) {

    var self = this;

    self.services.log.info('creating archive for job: ' + job.id + '; from folder ' + job.message.folder + '/node_modules; to ' + self.config.artifacts.folder);

    var hash = this.__generateDependencyHash(job);

    self.services.log.info('--> generated hash: ', hash);

    var sourceDirectory = path.join(path.resolve(job.message.folder), 'node_modules');
    var artifactsFolder = path.resolve(self.config.artifacts.folder);

    this.archive(sourceDirectory, artifactsFolder, hash, callback);
};

Service.prototype.archive = function (sourceDir, artifactPath, hash, callback) {

    var self = this;

    self.services.log.info('--> creating archive...');

    self.__archiver.createArchive(sourceDir, artifactPath, hash, function (err, result) {

        if (err) {
            self.services.log.error(err);
            return callback(err);
        }

        self.services.log.success('--> created archive ' + result); // result is tarball name
        callback(null, result);
    });
};

Service.prototype.unarchive = function (fromPath, toPath, callback) {

    var self = this;

    self.__filer.createFolderRecursive(toPath, function (err) {

        if (err)
            return callback(err);

        self.__archiver.unArchive(fromPath, toPath, function (err, result) {

            if (err)
                return callback(err);

            callback();
        });
    });
};

Service.prototype.__generateDependencyHash = function (job) {
    var pkg = this.__filer.getPackageJSON(job.message.folder);
    return this.__hasher.createPackageHash(pkg);
};

Service.prototype.start = function (callback) {
    this.__archiver = new Archiver();
    this.__filer = new Filer();
    this.__hasher = new Hasher();

    return callback();
};