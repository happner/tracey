'use strict';

/**
 * Dependencies
 */

var format = require('util').format;
var run = require('./util/run');


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

	if (!context.test_script) context.test_script = 'test';

	args.push(image, 'npm', 'run', context.test_script);

	return run('docker', args, {cwd:context.path})

		.then(function(value){

			context.test_results = deserializeResults(value);
		}).return (context);
}
