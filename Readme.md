# Tracey [![Build Status](https://travis-ci.org/happner/tracey.svg?branch=master)](https://travis-ci.org/happner/tracey)

[NB] THIS IS STILL CONCEPTUAL, WE ARE BUSY BUILDING IT, COME BACK IN ABOUT A WEEK OR SO.

Travis-like benchmarking framework. Special thanks to [Vadim Demedes](https://github.com/vdemedes) - as we based the framework on [Trevor](https://github.com/vadimdemedes/trevor).

<h1 align="center">
  <br>
  <img width="200" src="media/logo.png">
  <br>
  <br>
</h1>


## Purpose

Meant to run on a standalone purpose built box, Tracey exposes webhooks to github, based on tracey.yml, every time a check-in happens with github using [node-github-hook](https://github.com/nlf/node-github-hook), a run-job is enqueued using [file-queue](https://github.com/threez/file-queue) running in concurrency 1 mode, when the queued job is popped transactionally, the repository is downloaded and the tests for the repo are run, each in their own process using [happner-serial-mocha](https://github.com/happner/happner-serial-mocha). The length of time each test takes, with its suite is pushed to a database via [benchmarket](https://github.com/happner/benchmarket) for further scrutiny. It is by design that the system only runs 1 test at a time, so that there is as little concurrent noise as possible - which should give reasonably stable average metrics for test run times.

Tracey is not designed to be a module, but is rather a fully fledged service that manages the benchmarking of your tests in a controlled environment.

## Installation

```
$ npm install tracey --global
```

## Usage

Given the following `.tracey.yml` file:

```yaml
benchmarket:
  name: 'tracey test' #human readable label for your environment
  username: 'john' #benchmarket user
  password: 'doe' #benchmarket password
  api_key: '9c572bf0-eca1-4247-8bef-d1df51d42239' #benchmarket key

node_js:
  - '7'
  - '0.10'

github:
  token: #no token here - this is a public
  secret: 'YYTAAG4562fDSsa' #our github secret, used for all endpoints

repos:
  - owner: 'happner' #owner of repo
    name: 'tracey' #name, combined to form the full name tracey/happner
    test_script: 'npm test' #test script to run

  - owner: 'happner'
    name: 'another repo'
    test_folder: './test' #folder where tests are

job:
  folder: './tracey_job_folder' #where our jobs go to, in relation to index.js

notify:
  recipients: ['johndoe@missingperson.org'] #errors and speed reduction recipients
  threshold: 10 #percentage of decrease in overall speed to send out a warning email

queue:
    folder: './tracey_queue_folder' #where our queue is built, in relation to index.js

url: 'http://heathendigital.com/tracey/hooks' #public url, that Tracey listens on, where our github hooks are sending their payloads to
```

Run `tracey` in directory containing tracey.yml and files:

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
$ tracey run [repo name] [-c [commit]]
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
##TODO

- create linux service file
- have tracey run all tests in a folder, as opposed to running a test script
- sort out where the metrics go with new benchmarket, as a plugin
- sort out tpop issue?

## License

MIT © [Happner](https://github.com/happner)
