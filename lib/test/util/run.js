'use strict';

/**
 * Dependencies
 */

var Promise = require('bluebird');
//var spawn = require('child_process').spawn;
var spawn = require('cross-spawn');

var EventEmitter = require('events').EventEmitter;

var __events = new EventEmitter();
/**
 * Expose `run`
 */

module.exports = run;

module.exports.on = function(event, handler){
	__events.on(event, handler);
};

module.exports.removeListener = function(event, handler){
	__events.removeListener(event, handler);
};

/**
 * spawn() helper, that concatenates stdout & stderr
 * and returns a Promise
 */

function run (command, args, options) {

	return new Promise(function (resolve, reject) {

		var output = '';

		if (!options) options = {};

		var ps = spawn(command, args, options);

		ps.on('close', function (code) {

			if (code > 0) return reject(output);

			resolve(output);
		});

		ps.stderr.on('data', function (data) {

			var deserialized = data.toString();
			output += deserialized;
			__events.emit('error', deserialized);
		});

		ps.stdout.on('data', function (data) {

			var deserialized = data.toString();
			output += deserialized;
			__events.emit('data', deserialized);
		});
	});
}
