'use strict';

module.exports = upload;

function upload (context) {

  return new Promise(function (resolve, reject) {

    var test_metrics = require('test_metrics');

    console.log('DOING UPLOAD TO STATSD:::');

    console.log('SETTINGS:::', context.test_metrics);

    console.log('RESULTS:::', context.test_results);

    return resolve(context);

    test_metrics(context.test_metrics, context.test_results, function (e) {

      if (e) return reject(e);
      resolve(context);
    });

  });
}
