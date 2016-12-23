'use strict';

/**
 * Dependencies
 */

var format = require('util').format;
var run = require('./util/run');
var chalk = require('chalk');

/**
 * Expose `test`
 */

module.exports = test;

/**
 * Run `npm test`
 */

function deserializeResults(val) {
	try{
		return JSON.parse(val.split('::::output results::::')[1]);
	}catch(e){
		throw new Error('failed deserialising test results', e);
	}
}

function test (context) {

	console.log(chalk.green('test init:::'));

	var image = format('test-%s-%s', context.name, context.version);

	var args = [
		'run',
		'--rm'
	];

	// append default environment
	// variables to arguments
	var env = {
		CONTINUOUS_INTEGRATION: true,
		TRAVIS: true,
		CI: true,
		TRACEY:true
	};

	Object.keys(env).forEach(function (name) {
		var arg = format('%s=%s', name, env[name]);

		args.push('-e', arg);
	});

	args.push(image, 'node', 'tracey-test-runner.js');

	this.data = function(data){

		if (data.indexOf('::::suite-ended::::') > -1)
			console.log(chalk.green(data.replace('::::suite-ended::::', '') + ' done..'));

		console.log(chalk.green(data));
	}.bind(this);

	this.error = function(data){
		console.log(chalk.red(data));
	}.bind(this);

	run.on('data', this.data);
	run.on('error', this.error);

	console.log(chalk.green('about to start test run:::'));

	var _this = this;

	return run('docker', args, {cwd:context.path})

		.then(function(value){

			context.test_results = deserializeResults(value);

			run.removeListener('data', _this.data);
			run.removeListener('error', _this.error);

		}).return (context);
}
