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

function updatePackage(context){

	var traceyPack = require('../../../package.json');

	var tmpPath = context.path;

	var pack = require(tmpPath + path.sep + 'package.json');

	//update serial mocha, which is a test dependancy
	pack.dependencies['happner-serial-mocha'] = traceyPack.dependencies["happner-serial-mocha"];

	if (!pack.tracey) pack.tracey = {};

	if (context.testFolder) pack.tracey.testFolder = context.testFolder;

	if (!pack.tracey.testFolder) pack.tracey.testFolder = './test';

	//write our new package to the test folder
	fs.writeFileSync(tmpPath + path.sep + 'package.json', JSON.stringify(pack, null, 2));
}

function build (context) {

	var dockerfile = format('FROM node:%s-onbuild', context.version);

	var tmpPath = join(context.path, '.' + context.version + '.dockerfile');

	var testRunnerPath = path.resolve(__dirname, '../../../tracey-test-runner.js');

	//put the tracey runner in the root folder
	fs.copySync(testRunnerPath, context.path + path.sep + 'tracey-test-runner.js');

	//write the docker file to the root folder
	fs.writeFileSync(tmpPath, dockerfile);

	var image = format('test-%s-%s', context.name, context.version);

	updatePackage(context);

	return run('docker', ['build', '-t', image, '-f', tmpPath, '.'], {cwd:context.path}).return(context);
}
