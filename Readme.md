# Tracey [![Build Status](https://travis-ci.org/happner/tracey.svg?branch=master)](https://travis-ci.org/happner/tracey)

[NB] THIS IS STILL CONCEPTUAL, WE ARE BUSY BUILDING IT, COME BACK IN ABOUT A MONTH OR SO.

Travis-like benchmarking framework. Special thanks to [Vadim Demedes](https://github.com/vdemedes) - as we based the framework on Trevor.

<h1 align="center">
  <br>
  <img width="200" src="media/logo.png">
  <br>
  <br>
</h1>


## Purpose

Meant to run on a standalone purpose built box, Tracey exposes webhooks to github, based on tracey.yml, every time a check-in happens with github, a run-job is queued too bee-queue running in concurrency 1 mode (by default), when the queued job is started, the repository is downloaded and the tests for the repo are run, each in their own process using happner-serial-mocha. The length of time each test takes, with its suite is pushed to a database via benchmarket for further scrutiny. It is by design that the system only runs 1 test at a time, so that there is as little concurrent noise as possible - which should give reasonably stable average metrics for test run times, although you can up the concurrency if you feel it makes sense (multi-processor environments with lots of RAM)

## Installation

```
$ npm install tracey --global
```

## Usage

Given the following `.tracey.yml` file:

```yaml
node_js:
  - 'stable'
  - '0.12'
  - '0.10'
repos:
  - name: tracey
    url: https://github.com/happner/tracey #url to repo
    key: YYTAAG4562fDSsa
  - name: blahblah
    url: happner/blahblah #url to repo, shorthand will prepend github.com
    key: YYTAAG4562fDSsb #key shared with github, so we dont have funny runs happening
log_folder: ./logs #where our test logs go
redis:
    host: local
    port: 6379
notify:
  recipients: [johndoe@missingperson.org] #errors and speed reduction recipients
  threshold: 10 #percentage of decrease in overall speed to send out a warning email
queue:
    concurrency: 1
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
$ tracey run [repo name]
> pushed job to queue for repo blahblah
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
