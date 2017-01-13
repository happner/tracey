'use strict';

module.exports = upload;

function upload (context) {

  return new Promise(function (resolve, reject) {

    var test_metrics = require('test-metrics');

    test_metrics(context.test_metrics, context.test_results, function (e) {

      if (e) return reject(e);
      resolve(context);
    });
  });
}
