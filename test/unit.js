describe('unit tests', function () {

  this.timeout(120000);

  it('starts up the queue service, emits a job', function (done) {


    var QueueService = require('../lib/services/queue/service');

    var queueInstance = new QueueService();

    queueInstance.on('message-popped', function(message){

      //console.log('message-popped happened ', message);

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

  xit('tests the runner and the test', function (done) {

    var runner = require('../lib/job_types/performance_tracker/util/run');

    runner.on('data', function(data){

    });

    runner.on('error', function(data){

    });

    var testContext = {
      name:'node',
      version:'7'
    };

    var testLib = require('../lib/job_types/performance_tracker/test');

    testLib(testContext);

    done();

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
