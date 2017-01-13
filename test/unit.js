describe('unit tests', function () {

  this.timeout(120000);

  var TestHelper = require('./lib/helper')
    , path = require('path')
    , expect = require('expect.js')
    ;

  it('tests the config parser', function (done) {

    var projectRoot = path.resolve(__dirname, '..');

    var config = require('../lib/util/parse-config')(projectRoot + path.sep + '.tracey.yml');

    var privateConfig;

    try{
      privateConfig = require('../lib/util/parse-config')(projectRoot + path.sep + 'private/config.yml');
    }catch(e){}


    if (privateConfig) config = require('merge').recursive(config, privateConfig);

    expect(config.repos != null).to.be(true);

    done();

  });

  it('tests the service manager', function (done) {

    var projectRoot = path.resolve(__dirname, '..');

    var config = require('../lib/util/parse-config')(projectRoot + path.sep + '.tracey.yml');

    var privateConfig;

    try{
      privateConfig = require('../lib/util/parse-config')(projectRoot + path.sep + 'private/config.yml');
    }catch(e){}


    if (privateConfig) config = require('merge').recursive(config, privateConfig);

    var ServiceManager = require('../lib/services/service');

    var service = new ServiceManager();

    service.on('started', function(message){

      done();
    });

    service.start(config);

  });

  it('starts up the queue service, emits a job', function (done) {
    
    var QueueService = require('../lib/services/queue/service');

    var queueInstance = new QueueService();

    queueInstance.on('message-popped', function(message){

      done();
    });

    queueInstance.__emit('message-popped', {
        "id": "1482423997794_be289689-dddc-4c2f-89ef-21b9bddd38db",
        "message": {
          "repo": "happner/tracey",
          "event": {
            "type": "push",
            "name": "tracey",
            "owner": "happner",
            "branch": "refs/heads/master"
          },
          "config": {
            "owner": "happner",
            "name": "tracey",
            "test_script": "test-benchmarket",
            "node_js": [
              "7",
              "0.10"
            ]
          }
        }
      }
    );
  });

  it('tests the runner and the test', function (done) {

    var Runner = require('../lib/job_types/performance_tracker/runner');

    var testHelper = new TestHelper();

    var testPackage = {
      "name": "repo",
      "version": "0.0.1",
      "description": "test package",
      "license": "MIT",
      "main": "index.js",
      "repository": "https://github.com/owner/repo",
      "scripts": {},
      "dependencies": {},
      "tracey":{
        "testFolder":"./test"
      },
      "devDependencies": {}
    };

    var testPackagePaths = testHelper.createTempFile('package.json', JSON.stringify(testPackage), true);

    var mockJob = {
      message:{
        repo:"owner/repo",
        folder:testPackagePaths.folder,
        config:{

        },
        event:{
          owner:'owner',
          repo:'repo'
        },
        job_type:{
          settings:{
            username:'joe',
            password:'bloggs',
            host:'https://128.0.0.1'
          }
        }
      }
    };

    var runner = new Runner(mockJob);

    var addStep = function(context, step){

        if (context.stepsDone == null) context.stepsDone = [];

        console.log('doing step:::', step);
        context.stepsDone.push(step);
    };

    runner.internals.pullImage = function(context){
      addStep(context, 'pullImage');

      return new Promise(function (resolve, reject) {
        resolve(context);
      });
    };

    runner.internals.clean = function(context){
      addStep(context, 'clean');

      return new Promise(function (resolve, reject) {
        resolve(context);
      });
    };

    runner.internals.build = function(context){
      addStep(context, 'build');

      return new Promise(function (resolve, reject) {
        resolve(context);
      });
    };

    runner.internals.copy = function(src, dest){
      return dest;
    };

    runner.internals.test = function(context){

      addStep(context, 'test');

      context.test_results = {

      };

      return new Promise(function (resolve, reject) {
        resolve(context);
      });
    };

    runner.internals.upload = function(context){
      addStep(context, 'upload');

      return new Promise(function (resolve, reject) {
        resolve(context);
      });
    };

    runner.on('test-progress', function(data){
      console.log('test-progress:::', data.state);
    });

    runner.on('info', function(data){
      console.log('info:::', data);
    });

    runner.on('error', function(data){
      console.log('error:::', data);
    });

    runner.start(done);
  });


  it('starts up the queue service, emits a job', function (done) {

    var QueueService = require('../lib/services/queue/service');

    var queueInstance = new QueueService();

    queueInstance.services = {
      log:{
        info:function(){

        },
        warn:function(){

        },
        error:function(){

        },
        success:function(){

        }
      }
    };

    queueInstance.state = queueInstance.STATES.listening;

    queueInstance.on('message-popped', function(message){

      //console.log('message-popped happened ', message);
      message.commit();

    });

    queueInstance.config = {
      repos:[
        {
          owner:'test',
          name:'repo'
        }
      ]
    };

    queueInstance.__queue = {

      push:function(message, cb){

        console.log('pushin message:::', message);

        this.tpopHandler.call(queueInstance
          , null
          , message
          , function(){
            console.log('commit called');
            done();
          }
          , function(){
            console.log('rollback called');
          }
        );

        cb();

      }.bind(queueInstance.__queue),
      tpop:function(handler){
        this.tpopHandler = handler;
      }.bind(queueInstance.__queue)
    };

    queueInstance.listen(function(){

      queueInstance.push({'repo':'test/repo'}, function(){
        console.log('pushed test message');
        done();
      });
    });
  });

});
