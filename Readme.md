# Tracey [![Build Status](https://travis-ci.org/happner/tracey.svg?branch=master)](https://travis-ci.org/happner/tracey)
<h1 align="center">
  <br>
  <img width="200" src="media/logo.png">
  <br>
  <br>
</h1>

[NB] ALPHA, TRACEY IS NOT 100% RELIABLE YET.

Tracey is a Github webhook framework, based on a configuration file, she is able to create and listen on github webhooks, when she picks up a matching event she downloads the gthub repo and then runs a job based on a configured job_type. A job_type is essentially a plug-in that runs when Tracey picks up a github webhook event.

## Purpose

Meant to run on a standalone purpose built box, Tracey exposes webhooks to github, based on tracey.yml, every time a check-in happens with github, using [thompson](https://github.com/happner/thompson) as the listener to events. When a matching event is picked up, a matching job_type is found for the event and the matching job_type plugin is run to perform whatever is necessary on the repo.

## High level operation

### adding jobs to the queue

There are 2 possible ways that jobs are started on Tracey:

1. **via Github events**
   - Thompson receives Githuub events and passes these on to Tracey
   - When a matching event happens on github, and thompson alerts tracey about it, a run-job is enqueued using [file-queue](https://github.com/threez/file-queue) running in concurrency 1 mode. 
2. **via a cron-like schedule**
   - A schedule can be set up in the Tracey configuration file (see below) for each job
   - A job can only have one time slot per 24 hour period in which to run
   - When a schedule is triggered, a job is placed into the queue

### job is popped from the file-queue
When the queued job is popped transactionally, it is assigned a test-run-id in the format [utc]_[guid], a test folder is created in the format ./tracey_job_folder/owner/repo/[test run id], the job is assigned its folder and is passed to the test runner.

### repo cloned
The repository is cloned to a folder for the job, named as follows: [tracey_job_folder]/[repo owner]/[repo name]/[job id in format utc_guid]

### job_type plugin is initialised
The plugin matching the configured job type is passed the job details (job folder containing the repo, with settings)

### job_type plugin runs
The plugin runs, and the results are passed back to the job, tracey then commits the job.

### one at a time
It is by design that the system only runs 1 test at a time, so that there is as little concurrent noise as possible - which should give reasonably stable average metrics for test run times.

### not a module, tracey is a service
Tracey is not designed to be a module, but is rather a fully fledged service that manages the benchmarking of your tests in a controlled environment.


## Job dependencies

Each job repo requires it's own set of dependencies, which are usually installed via an automated ```npm install``` step when each job is run. However, if Tracey is run on a device with restricted memory, the ```npm install``` step may cause Tracey or even the device to crash. 

A different approach is taken on low-memory devices to alleviate this:

- Primary test server (running a Tracey job) runs any required `npm install` steps, and then creates a tarball of the repo's **node_modules** folder
- The tarball is then uploaded to an [IPFS (Inter-Planetary FileSystem)](ipfs.io) instance
- A secondary (memory-restricted) device (also running Tracey) downloads the required tarball from IPFS when a job is started
- The tarball is uncompressed into the **node_modules** folder for the job repo
- Tracey runs the job as usual



The following diagrams describe this process in more detail:

![tracey on test server](https://user-images.githubusercontent.com/9947358/29820426-b7fc1272-8cc4-11e7-9056-76be8812f6fa.png)

![tracey on field device](https://user-images.githubusercontent.com/9947358/29820427-b7fc1632-8cc4-11e7-982b-9f1313566b48.png)

### configuring artifact generation

The following snippets of the Tracey configuration file illustrates enabling artifact generation:

```yaml
# PRIMARY SERVER running Tracey - generates artifacts....
...
artifacts:	# the presence of this will enable the use of artifacts
  folder: './artifacts'	# where to temporarily store artifacts
  index: 'artifact_hashes.txt'	# the file in each repo that maintains a list of hashes
  ipfs:
    host: '192.168.0.4'	# the IPFS instance host
    port: '5001'	# the IPFS instance port
  upload: true	# if true, artifacts will be generated & uploaded to IPFS
...
```

```yaml
# SECONDARY DEVICE running Tracey with minimum memory...
...
artifacts:
  folder: './artifacts'
  index: 'artifact_hashes.txt'
  ipfs:
    host: '192.168.0.4'
    port: '5001'
  upload: false	# false - artifacts not generated or uploaded
...
```



### caveats

Repos that require a C++ compilation step are not supported using this process. In future, a cross-compilation step could be introduced during artifact generation for specific platforms.



JOB TYPES:
----------



There are a number of job types that can be configured for Tracey:

- **Built in:**
  - performance-tracker
- **External** ([tracey-job-modules](https://github.com/team-tenacious/tracey-job-modules)):
  - performance-tracker-lite
  - happn-protocol
  - happner-protocol



## 1.1 performance tracker:

*this is an internal module, and can be found in [/lib/job_types]()*

The performance_tracker injects a special test runner into the repo, [happner-serial-mocha](https://github.com/happner/happner-serial-mocha) is injected into the cloned app's dependancies, and then the [tracey-test-runner](https://github.com/happner/tracey/blob/master/tracey-test-runner.js) script is pushed to the cloned root, the test runner will run all the tests in the repos test folder by default, or it can be configured to run certain tests. Each test suite is loaded into its own process and is run separately. Only 1 test suite is run at a time, and tracey only runs 1 job at a time - thus the performance tracker can collect metrics about test durations that are fairly uncluttered by other things occuring in parallel. Special thanks to [Vadim Demedes](https://github.com/vdemedes) - as we based this job_type on [Trevor](https://github.com/vadimdemedes/trevor).
Performance metrics are sent to a statsd server, where they can be analysed using graphite. This is all done via the [test-metrics](https://github.com/happner/test-metrics) project.

### uses docker
A docker instance containing the repo, with the modified dependancies and tracey-test-runner and the configured nodejs version, is spun up and the tracey-test-runner script is executed inside the docker container, and produces a set of metrics about how long each test in the test folder took, broken down by file/suite/test. this data is outputted by the docker output, is pulled out by the tracey instance that kicked off docker and pushed into the test job folder.

### benchmark metrics are pushed to a test-metrics server
its metrics, with its suite and context will be pushed to a database via [test-metrics](https://github.com/happner/test-metrics) for further scrutiny.



## 2.1 performance-tracker-lite

This module replicates the behaviour of performance-tracker, but with the important distinction of **not using Docker**. This is intended for use on low-memory devices where Docker cannot be run.



## 2.2 happn-protocol

This module in turn uses the [happn-protocol](https://github.com/happner/happn-protocol) module to generate documentation for happn.



## 2.3 happner-protocol

This module in turn uses the [happner-protocol](https://github.com/happner/happner-protocol) module to generate documentation for happner.




## Security considerations

*although tracey is made to run jobs for downloaded repos as throw-away items, she may be handling proprietry code, if you are testing private repos, make sure your tracey server is secure!*
- tracey uses github tokens in her configuration to do things (access repos and webhooks) - the token is in the .tracey.yml file, as a token can in some cases be as powerful as a github user - take due precautions and look after your tokens.
- tracey also resets permissions on the tracey_job_folder and tracey_queue_folder to 777 - the entire repo is cloned to the job folder during a test run, and so if it is proprietory production code - be aware that anyone with access to the tracey server will be able to see the code.
- the github hook listener does not listen on an SSL channel, and expects posts from github to be over normal http. I would just use a domain with a [free cloudflare account](https://www.cloudflare.com/plans/) to remedy this.

## configuration file

The configuration file is in the tracey project, at the moment we configure repos we want to watch here, but will later on be storing the repos in a database. Given the following [.tracey.yml](https://github.com/happner/tracey/blob/master/.tracey.yml) file:
*tracey is being configured to listen to push events on 2 repos: happner/tracey and happner/happner respectively, she will respond to posts to her external address 139.59.215.133:8080*

```yaml
job_types:
  - name: 'performance_tracker' #built in job_type
    path: './lib/job_types/performance_tracker/runner' #what gets required
    settings:
      hostname: 'https://test-metrics.net' #wherever your test-metrics instance is running
      username: '[user]'
      password: '[password]'

github:
  token: #no token here - this is a public
  secret: 'YYTAAG4562fDSsa' #our github secret, used for all endpoints

artifacts:
  folder: './artifacts'
  index: 'artifact_hashes.txt'
  ipfs:
    host: '192.168.0.4'
    port: '5001'
  upload: true	
  
repos:
  - owner: 'happner' #owner of repo
    name: 'tracey' #name, combined to form the full name tracey/happner
    testFolder: './test' #folder containing tests to be benchmarked
    node_js:
      - '7'
      - '0.10'
    job_type: 'performance_tracker' #matching defined job type above

  - owner: 'happner' #owner of repo
    name: 'happner' #name, combined to form the full name tracey/happner
    testFolder: './test' #folder containing tests to be benchmarked
    node_js:
      - '7'
      - '0.10'
    job_type: 'performance-tracker-lite'
    schedule: '00 00 00 * * *'  # seconds|minute|hour|day of month|month|day of week
job:
  folder: './tracey_job_folder' #where our jobs go to, in relation to index.js

notify:
  recipients: ['johndoe@missingperson.org'] #errors and speed reduction recipients
  threshold: 10 #percentage of decrease in overall speed to send out a warning email

queue:
    folder: './tracey_queue_folder' #where our queue is built, in relation to index.js

url: 'http://139.59.215.133:8080' #public url, that Tracey listens on, where our github hooks are sending their payloads to
```

## prerequisites
- docker ([installation instructions](https://docs.docker.com/engine/installation/linux/ubuntulinux))
- nodejs
```bash
>sudo -s
>apt-get update
>apt-get install git build-essential -y

# install nodejs
# https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions (for updates to below)

>curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
>apt-get install nodejs
>node --version
```
- pm2
```bash
# install pm2
>npm install pm2@latest -g

```
## installation steps
*tracey is made to run on linux, installation is a bit manual I'm afraid, installation instructions a la ubuntu:*
```bash

# clone and install tracey service (installing in /projects as preference)

>cd /projects
>git clone https://github.com/happner/tracey.git # this repo

>cd tracey
>npm install

# create 2 default tracey folders to allow for logging and queueing:

>mkdir tracey_job_folder
>mkdir tracey_queue_folder

#modify our tracey config file (SEE ABOVE)
>vi .tracey.yml

# still cannot get tracey to process without running as sudo, working on this

# start pm2
>sudo pm2 start pm2.yml

# save pm2
>sudo pm2 save

# ensure tracey starts up on reboots
>sudo pm2 startup

[PM2] Spawning PM2 daemon with pm2_home=/home/tracey/.pm2
[PM2] PM2 Successfully daemonized
[PM2][WARN] Applications index not running, starting...
[PM2] App [index] launched (1 instances)
┌──────────┬────┬─────────┬───────┬────────┬─────────┬────────┬─────┬───────────┬──────────┐
│ App name │ id │ mode    │ pid   │ status │ restart │ uptime │ cpu │ mem       │ watching │
├──────────┼────┼─────────┼───────┼────────┼─────────┼────────┼─────┼───────────┼──────────┤
│ index    │ 0  │ cluster │ 10134 │ online │ 0       │ 0s     │ 14% │ 21.0 MB   │ enabled  │
└──────────┴────┴─────────┴───────┴────────┴─────────┴────────┴─────┴───────────┴──────────┘

# view pm2 logs to ensure we are started up and listening
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

## GOTCHAS

- an initial run can happen on startup, by using the -r commandline argument, and specifying the repo name in the format owner/repo, for instance this is how I am testing tracey:
```bash
# in tracey root folder:
node index.js -r happner/tracey
```

- for the performance_tracker test results are passed back from the docker instance using a starttag and endtag with [stdout pushes of the results object](https://github.com/happner/tracey/blob/master/tracey-test-runner.js#L41), these tags appear to be console.log comments, but are vital for getting the test results acorss from the docker instance.

## TODO

- ~~create a non-docker version of the runner for ARM devices~~
- issue with permissions on git clone, can only run the service as sudo?
- have token ENV variables check on startup TRACEY_TOKEN
- have job folder in structure tracey_job_folder/[owner]/[repo]/[branch]/[run_id]
- store the context with the metrics in tracey_job_folder/[owner]/[repo]/[branch]/[run_id]

## License

MIT © [Happner](https://github.com/happner)
