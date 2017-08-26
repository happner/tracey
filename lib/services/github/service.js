var async = require('async');
var url = require('url');
var gitclone = require('gitclone');
var Thompson = require('thompson');

var Utils = require('tracey-job-modules').Utils;
var GitUtils = Utils.Giteriser;

function Service() {
}

Service.prototype.cloneRepo = function (opts, callback) {

    var self = this;

    self.__checkOpts(opts)
        .then(function () {

            var gitUtils = new GitUtils(opts.user, opts.repo, opts.dest);

            gitUtils.clone(opts.dest, function (err) {

                if (err) {
                    self.services.log.error('error cloning repo ' + opts.repo + ' into ' + opts.dest, err);
                    return callback(err);
                }

                self.services.log.info('successfully cloned ' + opts.repo + ' into ' + opts.dest);
                callback();
            });
        })
        .catch(function (err) {
            return callback(err);
        });
};

Service.prototype.commitAndPush = function (opts, files, callback) {

    var self = this;

    self.__checkOpts(opts)
        .then(function () {

            var gitUtils = new GitUtils(opts.user, opts.repo, opts.dest);

            async.series([

                function (cb1) {

                    self.services.log.info('adding to git --> ', opts.repo);

                    gitUtils.add(files, function (err) {

                        if (err)
                            return cb1(err);

                        cb1();
                    });
                },
                function (cb2) {

                    self.services.log.info('committing to git --> ', opts.repo);

                    gitUtils.commit('tracey git commit', function (err) {

                        if (err)
                            return cb2(err);

                        self.services.log.info('successfully committed to git --> ', opts.repo);
                        cb2();
                    });
                },
                function (cb3) {
                    gitUtils.status(function (err, result) {

                        if (err)
                            return cb3(err);

                        var currentBranch = result.current;

                        self.services.log.info('pushing origin to git --> ', opts.repo);

                        gitUtils.push(currentBranch, function (err) {

                            if (err)
                                return cb3(err);

                            self.services.log.info('successfully pushed origin to git --> ', opts.repo);
                            cb3();
                        });
                    });
                }
            ], function (err, result) {
                if (err) {
                    self.services.log.error(err);
                    return callback(err);
                }

                self.services.log.success('successfully committed and pushed to git --> ', opts.repo);
                callback();
            });
        })
        .catch(function (err) {
            return callback(err);
        })
};

Service.prototype.start = function (callback) {

    try {

        // thompson-specific options
        var options = {
            "url": this.config.url,
            "token": this.config.github.user.token,
            "secret": this.config.github.user.secret,
            "host": this.config.host ? this.config.host : "0.0.0.0"
        };

        this.__thompson = new Thompson(options);

        this.__activateWebHooks(callback);

    } catch (e) {
        console.log(e);
        callback(e);
    }
};

Service.prototype.stop = function (callback) {

    //exit not there yet, but I want to add it
    if (this.__thompson && this.__thompson.exit)
        return this.__thompson.exit(callback);

    callback();
};

Service.prototype.__handleGithubEvent = function (message) {

    var self = this;

    self.services.log.success('github event happened, repo:::' + message.name);
    self.services.log.success('github event happened, event:::' + message.event);

    self.config.repos.forEach(function (repo) {

            if (repo.name === message.name &&
                repo.owner === message.owner &&
                repo.events.indexOf(message.event) > -1 &&
                repo.schedule == null) {

                self.services.log.info('adding job to queue for repo: ', repo.name);

                var queueItem = {
                    repo: message.owner + '/' + message.name,
                    event: {
                        type: message.event,
                        name: message.name,
                        owner: message.owner,
                        branch: message.branch
                    }
                };

                self.services.queue.push(queueItem, function (e) {

                    if (e) {
                        self.services.log.error('bad trick, Tracey was unable to push a job event to the queue', e);
                        self.services.log.error('error message', e.toString());
                    }
                });
            }

            if (repo.schedule != null) // if repo has schedule defined, don't do anything
                self.services.log.info('skipping adding job to queue for repo: ', repo.name);
        }
    );
};

Service.prototype.__activateWebHooks = function (callback) {

    var self = this;

    if (!self.config.repos || self.config.repos.length == 0)
        return callback('Tracey needs at least 1 repo configured in.tracey.yml to be of any use...');

    var added = {};

    self.config.repos.forEach(function (repo) {

        var repoFullname = repo.owner + '/' + repo.name;

        if (added[repoFullname]) {
            self.services.log.warn('duplicate repo configured, ' + repoFullname + ' using the first one found');
            return;
        }

        added[repoFullname] = repo;

        if (!repo.events || repo.events.length == 0)
            repo.events = ['push', 'pull_request'];

        self.__thompson.addRepo({
            name: repoFullname,
            events: repo.events
        })
    });

    self.__thompson.on('webhook-event', self.__handleGithubEvent.bind(self));

    self.__thompson.listen()

        .then(function () {
            self.services.log.success('listening for event(s) on url ' + url);
            callback();
        })
        .catch(function (e) {
            self.services.log.error('oh dear olde chap, thompson failed to initialize!', e);
            callback(e);
        });
};

Service.prototype.__checkOpts = function (opts) {

    return new Promise(function (resolve, reject) {

        if (!opts.user)
            reject(new Error('"user" parameter missing'));

        if (!opts.repo)
            reject(new Error('"repo" parameter missing'));

        if (!opts.dest)
            reject(new Error('"dest" parameter missing'));

        resolve();
    });

};

module.exports = Service;