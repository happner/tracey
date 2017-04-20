var expect = require('expect.js');
var path = require('path');
var fs = require('fs');
var yaml = require('yamljs');

describe('func - happn-protocol job-runner', function () {

    this.timeout(60000);

    context('', function () {

        beforeEach('setup', function (done) {

            var configPath = path.join(__dirname, '..', path.sep, 'lib', 'happn-protocol.yml');
            this.__config = yaml.parse(fs.readFileSync(configPath, 'utf-8'));

            var ServiceManager = require('../../lib/services/service');
            this.__serviceManager = new ServiceManager();

            done();
        });

        afterEach('stop', function (done) {
            done();
        });

        context('start', function () {

            it('webhook successfully receives a Github push event and adds it to the queue', function (done) {

                var self = this;

                var mockMessage = {
                    event: "push",
                    name: "happn-protocol",
                    owner: "happner",
                    branch: "master",
                    detail: ""
                };

                try {
                    this.__serviceManager.start(this.__config);

                    setTimeout(function () {

                        // shortcut the event
                        self.__serviceManager.services['github'].__handleGithubEvent(mockMessage);

                        setTimeout(function () {
                            done();
                        }, 10000);

                    }, 5000)
                } catch (e) {
                    return done(e);
                }
            });

        });
    });
});
