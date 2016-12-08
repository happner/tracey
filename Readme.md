# Tracey [![Build Status](https://travis-ci.org/happner/tracey.svg?branch=master)](https://travis-ci.org/happner/tracey)

[NB] THIS IS STILL CONCEPTUAL, WE ARE BUSY BUILDING IT, COME BACK IN ABOUT A MONTH OR SO.

Travis-like benchmarking framework. Special thanks to [Vadim Demedes](https://github.com/vdemedes) - as we based the framework on [Trevor](https://github.com/vadimdemedes/trevor).

<h1 align="center">
  <br>
  <img width="200" src="media/logo.png">
  <br>
  <br>
</h1>


## Purpose

Meant to run on a standalone purpose built box, Tracey exposes webhooks to github, based on tracey.yml, every time a check-in happens with github using [node-github-hook](https://github.com/nlf/node-github-hook), a run-job is enqueued using [file-queue](https://github.com/threez/file-queue) running in concurrency 1 mode, when the queued job is popped transactionally, the repository is downloaded and the tests for the repo are run, each in their own process using [happner-serial-mocha](https://github.com/happner/happner-serial-mocha). The length of time each test takes, with its suite is pushed to a database via [benchmarket](https://github.com/happner/benchmarket) for further scrutiny. It is by design that the system only runs 1 test at a time, so that there is as little concurrent noise as possible - which should give reasonably stable average metrics for test run times.

## Installation

```
$ npm install tracey --global
```

## Usage

Given the following `.tracey.yml` file:

```yaml
benchmarket:
  name: 'test server 2' #human readable label for your environment
  username: 'john' #benchmarket user
  password: 'doe' #benchmarket password
  api_key: '9c572bf0-eca1-4247-8bef-d1df51d42239' #benchmarket key
node_js:
  - '7'
  - '6'
  - '0.10'
repos:
  - name: 'tracey'
    url: 'https://github.com/happner/tracey' #url to repo
    key: 'YYTAAG4562fDSsa'
  - name: 'blahblah'
    url: 'happner/blahblah' #url to repo, shorthand will prepend github.com
    key: 'YYTAAG4562fDSsb' #key shared with github, so we dont have funny runs happening
log_folder: './test/logs' #where our test logs go
redis:
    host: 'local'
    port: '6379'
notify:
  recipients: ['johndoe@missingperson.org'] #errors and speed reduction recipients
  threshold: 10 #percentage of decrease in overall speed to send out a warning email
queue:
    folder: './test/queue'
```

Run `tracey` in directory containing tracey.yml:

```
$ tracey start
$ tracey service running...
```

Stop service:
```
$ tracey stop
$ tracey service stopped ok...
```

Run latest repo by name:
```
$ tracey run -r [repo name] [-c [commit]]
> pushed job to queue for repo blahblah, commit 5b30916447af4a56cab787e1ce120a613541f348
> running test for repo blahblah, node version 0.10
> ... mocha output ...

> TEST RUN COMPLETE
> -----------------

> files:  19
>  L suites:  42
>    L tests:  74
>       L passed: 73
>       L failed: 1

> average test timespan decreased by 12%, over the threshold, notifications sent

```

## License

MIT © [Happner](https://github.com/happner)
