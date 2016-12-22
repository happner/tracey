describe('unit tests', function () {

  this.timeout(120000);


  it('starts up the queue service, pops a job on the queue', function (done) {


    var QueueService = require('../lib/queue/service');

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

});
