module.exports = JobUtil;

var Utils = require('tracey-job-modules').Utils;

var Filer = Utils.Filer;
var Hasher = Utils.PackageHasher;
var Archiver = Utils.Archiver;
var IpfsUtil = Utils.IpfsUtil;

function JobUtil() {
    this.__filer = new Filer();
    this.__hasher = new Hasher();
    this.__archiver = new Archiver();
    this.__ipfsUtil = new IpsUtil();
}

JobUtil.prototype.__generateDependencyHash = function (packageJson, callback) {

};

JobUtil.prototype.__findIpfsAddress = function (dependencyHash, callback) {

};

JobUtil.prototype.__writeDependencyHash = function (dependencyHash, ipfsAddress, callback) {

};

JobUtil.prototype.__uploadToIpfs = function (job, tarFilePath, callback) {

};