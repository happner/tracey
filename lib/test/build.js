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

function updatePackage(tmpPath){

	console.log('updatePackage:::', tmpPath);

	var traceyPack = require('../package.json');
	var pack = require(tmpPath + path.sep + 'package.json');

	//update serial mocha, which is a test dependancy
	pack.dependancies['happner-serial-mocha'] = traceyPack["happner-serial-mocha"];
	//and now write package back again
	console.log('written serial mocha:::', JSON.stringify(pack, null, 2));
	fs.writeFileSync(tmpPath + path.sep + 'package.json', JSON.stringify(pack, null, 2));
}

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

	updatePackage(tmpPath);

	return run('docker', ['build', '-t', image, '-f', tmpPath, '.'], {cwd:context.path}).return(context);
}
