'use strict';

/**
 * Dependencies
 */

var format = require('util').format;

var run = require('./util/run');


/**
 * Expose `pull-image`
 */

module.exports = pullImage;


/**
 * Pull docker image for a specific node version
 */

function pullImage (context) {

	var image = format('node:%s-onbuild', context.version);

	// var env = {
	// 	DOCKER_TLS_VERIFY:"1",
	//   DOCKER_HOST:"tcp://192.168.99.100:2376",
	//   DOCKER_MACHINE_NAME:"default",
	// 	DOCKER_CERT_PATH:"/Users/simonbishop/.docker/machine/machines/default"
	// };

	return run('docker', ['pull', image], {cwd:context.path}).return(context);
}
