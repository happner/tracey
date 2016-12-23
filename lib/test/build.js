'use strict';

/**
 * Dependencies
 */

var format = require('util').format;
var path = require('path');
var join = path.join;
var fs = require('fs-extra');

var run = require('./util/run');


/**
 * Expose `build`
 */

module.exports = build;


/**
 * Build docker image for a specific node version
 */

function build (context) {

	var dockerfile = format('FROM node:%s-onbuild', context.version);

	var tmpPath = join(context.path, '.' + context.version + '.dockerfile');

	var testRunnerPath = path.resolve(__dirname, '../../tracey-test-runner.js');

	console.log('testRunnerPath:::', testRunnerPath);

	//put the tracey runner in the root folder
	fs.copySync(testRunnerPath, context.path + path.sep + 'tracey-test-runner.js');

	//write the docker file to the root folder
	fs.writeFileSync(tmpPath, dockerfile);

	var image = format('test-%s-%s', context.name, context.version);

	return run('docker', ['build', '-t', image, '-f', tmpPath, '.'], {cwd:context.path}).return(context);
}
