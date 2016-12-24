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

##Security considerations
*although tracey is made to run tests as throw-away items, she may be handling proprietry code, if you are testing private repos, make sure your tracey server is secure!*
- tracey uses github tokens in her configuration to do things (access repos and webhooks) - the token is in the .tracey.yml file or could be an environment variable, as token can in some cases be as powerful as a github user - so take care
- tracey also resets permissions on the tracey_job_folder and tracey_queue_folder to 777 - the entire repo is cloned to the job folder during a test run, and so if it is proprietory production code - be aware that anyone with access to the tracey server will be able to see the code.
- the github hook listener does not listen on an SSL channel, and expects posts from github to be over normal http.

## configuration file

Given the following `.tracey.yml` file:

```yaml
benchmarket:
  name: 'tracey test' #human readable label for your environment
  username: 'john' #benchmarket user
  password: 'doe' #benchmarket password
  api_key: '9c572bf0-eca1-4247-8bef-d1df51d42239' #benchmarket key

github:
  token: #no token here - this is a public
  secret: 'YYTAAG4562fDSsa' #our github secret, used for all endpoints

repos:
  - owner: 'happner' #owner of repo
    name: 'tracey' #name, combined to form the full name tracey/happner
    testFolder: './test' #folder containing tests to be benchmarked
    node_js:
      - '7'
      - '0.10'
  - owner: 'happner' #owner of repo
    name: 'happner' #name, combined to form the full name tracey/happner
    testFolder: './test' #folder containing tests to be benchmarked
    node_js:
      - '7'
      - '0.10'
job:
  folder: './tracey_job_folder' #where our jobs go to, in relation to index.js

notify:
  recipients: ['johndoe@missingperson.org'] #errors and speed reduction recipients
  threshold: 10 #percentage of decrease in overall speed to send out a warning email

queue:
    folder: './tracey_queue_folder' #where our queue is built, in relation to index.js

url: 'http://139.59.215.133:8080' #public url, that Tracey listens on, where our github hooks are sending their payloads to
```


##installation steps
*tracey is made to run on linux, installation is a bit manual I'm afraid, installation instructions a la ubuntu:*
```bash

>sudo -s
>apt-get update
>apt-get install git build-essential -y

# install nodejs
# https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions (for updates to below)

>curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
>apt-get install nodejs
>node --version

# install pm2

>npm install pm2@latest -g

# create user to run tracey as

>adduser --disabled-password tracey

# install tracey service (as user) (installing in /projects as preference)

>cd /projects
>git clone https://github.com/happner/tracey.git # this repo

#change ownership to tracey
>chown -R tracey ./tracey
>cd tracey/
>npm install

#switch to tracey user
>su tracey

#create and modify 2 default tracey folders to allow for logging and queueing:

>mkdir tracey_job_folder && chown -R tracey tracey_job_folder && chmod 755 tracey_job_folder
>mkdir tracey_queue_folder && chown -R tracey tracey_queue_folder && chmod 755 tracey_queue_folder

#modify our tracey config file (SEE ABOVE)
>vi .tracey.yml

#vback to root session
>exit

#ensure tracey starts up on reboots
>pm2 startup -u tracey

#back to tracey user
>su tracey

#start pm2
>pm2 start pm2.yml

[PM2] Spawning PM2 daemon with pm2_home=/home/tracey/.pm2
[PM2] PM2 Successfully daemonized
[PM2][WARN] Applications index not running, starting...
[PM2] App [index] launched (1 instances)
┌──────────┬────┬─────────┬───────┬────────┬─────────┬────────┬─────┬───────────┬──────────┐
│ App name │ id │ mode    │ pid   │ status │ restart │ uptime │ cpu │ mem       │ watching │
├──────────┼────┼─────────┼───────┼────────┼─────────┼────────┼─────┼───────────┼──────────┤
│ index    │ 0  │ cluster │ 10134 │ online │ 0       │ 0s     │ 14% │ 21.0 MB   │ enabled  │
└──────────┴────┴─────────┴───────┴────────┴─────────┴────────┴─────┴───────────┴──────────┘

#view pm2 logs to ensure we are started up and listening
# the 0 matches what is found in the above PM2 response
pm2 logs 0

/home/tracey/.pm2/logs/index-out-0.log last 10 lines:
0|index    | listening on:  {
0|index    |   "host": "0.0.0.0",
0|index    |   "port": 8080,
0|index    |   "path": "/",
0|index    |   "secret": "simon_webhook_secret_77652ghjstr"
0|index    | }
0|index    | listening for hook events on 0.0.0.0:8080
0|index    | listening for event(s) on url [object Object]
0|index    | started service: github
0|index    | tracey up and running..


```

## configuration file

Given the following `.tracey.yml` file:

```yaml
benchmarket:
  name: 'tracey test' #human readable label for your environment
  username: 'john' #benchmarket user
  password: 'doe' #benchmarket password
  api_key: '9c572bf0-eca1-4247-8bef-d1df51d42239' #benchmarket key

github:
  token: #no token here - this is a public
  secret: 'YYTAAG4562fDSsa' #our github secret, used for all endpoints

repos:
  - owner: 'happner' #owner of repo
    name: 'tracey' #name, combined to form the full name tracey/happner
    testFolder: './test' #folder containing tests to be benchmarked
    node_js:
      - '7'
      - '0.10'
  - owner: 'happner' #owner of repo
    name: 'happner' #name, combined to form the full name tracey/happner
    testFolder: './test' #folder containing tests to be benchmarked
    node_js:
      - '7'
      - '0.10'
job:
  folder: './tracey_job_folder' #where our jobs go to, in relation to index.js

notify:
  recipients: ['johndoe@missingperson.org'] #errors and speed reduction recipients
  threshold: 10 #percentage of decrease in overall speed to send out a warning email

queue:
    folder: './tracey_queue_folder' #where our queue is built, in relation to index.js

url: 'http://139.59.215.133:8080' #public url, that Tracey listens on, where our github hooks are sending their payloads to

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

- sort out where the metrics go with new benchmarket, as a plugin
- create a non-docker version o fthe runner for ARM devices
- issue with permissions on git clone?
## License

MIT © [Happner](https://github.com/happner)
