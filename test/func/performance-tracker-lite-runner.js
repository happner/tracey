var expect = require('expect.js');
var path = require('path');
var fs = require('fs');
var yaml = require('yamljs');
var moment = require('moment');

describe('func - performance-tracker-lite job-runner', function () {

    this.timeout(1000000);

    context('', function () {

        beforeEach('setup', function (done) {

            var configPath = path.join(__dirname, '..', path.sep, 'lib', 'performance-tracker-lite.yml');
            this.__config = yaml.parse(fs.readFileSync(configPath, 'utf-8'));

            this.__config.job_types[0].settings.hostname = process.env['GRAPHITE_HOST'];
            this.__config.job_types[0].settings.username = process.env['GRAPHITE_USER'];
            this.__config.job_types[0].settings.password = process.env['GRAPHITE_PASSWORD'];

            this.__config.github.user.token = process.env['GITHUB_TOKEN'];
            this.__config.github.user.email = process.env['GITHUB_EMAIL'];
            this.__config.github.user.name = process.env['GITHUB_NAME'];

            var ServiceManager = require('../../lib/services/service');
            this.__serviceManager = new ServiceManager();

            done();
        });

        afterEach('stop', function (done) {
            done();
        });

        context('start', function () {

            //it('webhook successfully receives a Github push event and adds it to the queue', function (done) {
            //
            //    var self = this;
            //
            //    var mockMessage = {
            //        event: "push",
            //        name: "happn",
            //        owner: "happner",
            //        branch: "master",
            //        detail: ""
            //    };
            //
            //    try {
            //        this.__serviceManager.start(this.__config);
            //
            //        setTimeout(function () {
            //
            //            // shortcut the event by invoking the handler directly
            //            self.__serviceManager.services['github'].__handleGithubEvent(mockMessage);
            //
            //            setTimeout(function () {
            //                done();
            //            }, 900000);
            //
            //        }, 5000)
            //    } catch (e) {
            //        return done(e);
            //    }
            //});

            it('cron schedule runs and adds job to the queue', function (done) {

                var self = this;

                //schedule pattern: (seconds) (minute) (hour) (day of month) (month) (day of week)
                self.__config.repos[0].schedule = moment().add(20, 'seconds').format('ss mm HH') + ' * * *';

                try {
                    this.__serviceManager.start(this.__config);

                    setTimeout(function () {
                        done();
                    }, 900000)
                } catch (e) {
                    return done(e);
                }
            });

        });
    });
});
