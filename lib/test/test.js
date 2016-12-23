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

	var dataHandler = function(data){

		if (data.indexOf('::::suite-ended::::') > -1)
			console.log(chalk.green(data.replace('::::suite-ended::::', '') + ' done..'));
	};

	var errorHandler = function(data){
		console.log(chalk.red(data));
	};

	run.on('data', dataHandler);
	run.on('error', errorHandler);

	console.log(chalk.green('about to start test run:::'));

	return run('docker', args, {cwd:context.path})

		.then(function(value){

			context.test_results = deserializeResults(value);

			run.removeListener('data', dataHandler);
			run.removeListener('error', errorHandler);

		}).return (context);
}
