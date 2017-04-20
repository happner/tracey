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

            //this.__config = require('../../lib/happn-protocol.yml');

            var ServiceManager = require('../../lib/services/service');
            this.__serviceManager = new ServiceManager();

            done();
        });

        afterEach('stop', function (done) {
            done();
        });

        context('start', function () {

            it('successfully starts the ServiceManager', function (done) {

                try{
                    this.__serviceManager.start(this.__config);

                    setTimeout(function(){
                        done();
                    }, 30000)
                }catch(e){
                    return done(e);
                }
            });

        });
    });
});
