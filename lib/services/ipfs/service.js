module.exports = Service;

var Utils = require('tracey-job-modules').Utils;
var IpfsUtil = Utils.IpfsUtil;

function Service() {
    this.__ipfsUtil = null;
}

Service.prototype.__getIpfsInstance = function (config) {

    var self = this;

    if (self.__ipfsInstance == null) {
        self.__ipfsInstance = new IpfsUtil();
        self.__ipfsInstance.init(config);
    }

    return self.__ipfsInstance;
};

Service.prototype.upload = function (config, filePath, callback) {

    var self = this;

    self.__getIpfsInstance(config).uploadTar(filePath, function (err, result) {

        if (err) {
            self.services.log.error(err);
            return callback(err);
        }

        self.services.log.info('tar file uploaded to IPFS with address hash: ', result);
        callback(null, result);
    });
};

Service.prototype.download = function (config, address, toFile, callback) {

    var self = this;

    self.__getIpfsInstance(config).getTar(address, toFile, function (err, result) {

        if (err) {
            self.services.log.error(err);
            return callback(err);
        }

        self.services.log.info('tar file retrieved from IPFS with address hash: ', address, '; saved to: ', toFile);
        callback(null, result);
    });
};

Service.prototype.start = function (callback) {
    callback();
};