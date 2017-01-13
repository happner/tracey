'use strict';

module.exports = upload;

function upload (context) {

  return new Promise(function (resolve, reject) {

    var test_metrics = require('test-metrics');

    console.log('TEST_RESULTS:::', JSON.stringify(context.test_results));

    test_metrics(context.test_metrics, context.test_results, function (e) {

      if (e) return reject(e);
      resolve(context);
    });
  });
}
