module.exports = Service;

var path = require('path');

var Utils = require('tracey-job-modules').Utils;
var Archiver = Utils.Archiver;
var Filer = Utils.Filer;
var Hasher = Utils.PackageHasher;

function Service() {
}

Service.prototype.getIpfsArtifactAddress = function (job) {
    var hash = this.__generateDependencyHash(job);
    return this.__filer.lookupDependencyHash(job.message.config.artifacts.index, hash);
};

Service.prototype.updateArtifactHashFile = function (filePath, lineItem, callback) {

    var self = this;

    self.services.log.info('updating artifact_hashes.txt --> ', lineItem);

    self.__filer.addLineToFile(filePath, lineItem, function (err, result) {
        if (err) {
            self.services.log.error(err);
            return callback(err);
        }

        self.services.log.info('successfully updated artifact_hashes.txt');

        callback();
    })
};

Service.prototype.generate = function (job, callback) {

    var self = this;

    self.services.log.info('creating archive for job: ' + job.id + '; from folder ' + job.message.folder + '/node_modules; to ' + job.message.config.artifacts.folder);

    var hash = this.__generateDependencyHash(job);
    console.log('::: HASH: ', hash);
    var modulesFolder = path.join(path.resolve(job.message.folder), 'node_modules');
    console.log('::: MODULES FOLDER: ', modulesFolder);
    var artifactsFolder = path.resolve(job.message.config.artifacts.folder);
    console.log('::: ARTIFACTS FOLDER: ', artifactsFolder);

    self.__archiver.createArchive(modulesFolder, artifactsFolder, hash, function (err, result) {

        if (err) {
            console.log('::: ERROR CREATING ARCHIVE: ', err);
            self.services.log.error(err);
            return callback(err);
        }

        console.log('::: TARBALL NAME: ', result);
        self.services.log.success('created archive ' + result); // result is tarball name
        callback(null, result);
    });
};

Service.prototype.unarchive = function (fromPath, toPath, callback) {

    this.__archiver.unArchive(fromPath, toPath, function (err, result) {

        if (err)
            return callback(err);

        callback();
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