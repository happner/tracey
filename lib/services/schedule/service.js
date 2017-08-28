module.exports = Service;

var CronJob = require('cron').CronJob;

function Service() {
    // keep a reference for each cron job
    this.__cronJobs = [];
}

Service.prototype.start = function (callback) {

    var _this = this;

    _this.config.repos.forEach(function (repo) {

        if (repo.schedule != null) {

            try {
                var cronJob = new CronJob(repo.schedule, function () {

                    console.log('cron running, adding job to queue');

                    _this.services.queue.push({
                        repo: repo.owner + '/' + repo.name,
                        event: {
                            type: 'push',
                            name: repo.name,
                            owner: repo.owner,
                            branch: 'master'
                        }
                    }, function (e) {

                        if (e) {
                            _this.services.log.error('bad trick, Tracey was unable to push a job event to the queue', e);
                            _this.services.log.error('error message', e.toString());
                        } else
                            _this.services.log.info('cron has added job ' + repo.name + ' to queue');
                    });
                }, null, true);

                _this.services.log.info('creating cron job: ', repo.name);

                _this.__cronJobs.push(cronJob);

            } catch (err) {
                _this.services.log.error('failed to create new cron job', err);
                return callback(err);
            }
        }
    });

    callback();
};

Service.prototype.stop = function (callback) {
    callback();
};

