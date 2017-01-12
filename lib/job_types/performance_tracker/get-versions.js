'use strict';

/**
 * Dependencies
 */

var fetchStableVersion = require('stable-node-version');


/**
 * Expose `get-versions`
 */

module.exports = getVersions;


/**
 * Get requested Node.js versions
 */

function getVersions (config) {

	return (config.node_js || ['stable']).map(function (version) {
		if (version === 'stable') return fetchStableVersion();
		return version;
	});
}
