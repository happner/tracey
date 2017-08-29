var expect = require('expect.js');
var path = require('path');
var fs = require('fs-extra');

describe('unit - artifact-service', function () {

    this.timeout(60000);

    context('', function () {

        beforeEach('setup', function (done) {

            this.__artifactService = new (require('../../lib/services/artifact/service'))();

            this.__artifactService.services = {
                log: {
                    error: function (msg) {
                        console.log(msg);
                    },
                    info: function (msg) {
                        console.log(msg);
                    },
                    success: function (msg) {
                        console.log(msg);
                    }
                }
            };

            this.__artifactService.start(function (err) {
                if (err)
                    return done(err);

                done();
            });
        });

        afterEach('stop', function (done) {
            done();
        });

        context('start', function () {


            it('successfully creates artifact and unarchives', function (done) {

                var self = this;

                var sourceDir = path.join(__dirname, '..'); //test dir
                var artifactPath = path.join(__dirname, '..', '..', 'artifacts');

                console.log('source dir -->: ', sourceDir);
                console.log('artifact dir -->: ', artifactPath);

                this.__artifactService.archive(sourceDir, artifactPath, '1234', function (err) {
                    if (err)
                        return done(err);

                    var fromPath = path.join(artifactPath, '1234.tar');
                    var toPath = artifactPath;

                    self.__artifactService.unarchive(fromPath, toPath, function (err) {

                        if (err)
                            return done(err);

                        var exists = fs.existsSync(path.join(artifactPath, 'unit'));

                        expect(exists).to.equal(true);

                        fs.remove(artifactPath, function (err) {
                            if (err)
                                return done(err);

                            done();
                        })
                    });
                });
            });
        });
    });
});
