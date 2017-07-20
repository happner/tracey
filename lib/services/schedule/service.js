module.exports = Service;

var CronJob = require('cron').CronJob;

function Service() {
    // keep a reference for each cron job
    this.__cronJobs = [];
}

Service.prototype.start = function (callback) {

    var _this = this;

    _this.config.repos.forEach(function (repo) {

        if (repo.schedule) {

            _this.__cronJobs.push(new CronJob(repo.schedule, function () {

                _this.services.queue.push({
                    repo: message.owner + '/' + message.name,
                    event: {
                        type: message.event,
                        name: message.name,
                        owner: message.owner,
                        branch: message.branch
                    }
                }, function (e) {

                    if (e) {
                        _this.services.log.error('bad trick, Tracey was unable to push a job event to the queue', e);
                        _this.services.log.error('error message', e.toString());
                    }
                });
            }, null, true, 'America/Los_Angeles'));
        }
    });
};

Service.prototype.stop = function (callback) {
    callback();
};

