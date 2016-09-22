var _ = require('underscore');
var parser = require('parity-parser');

require('dotenv').load();

var redis = require('redis');
var client = redis.createClient(
  process.env.REDISCLOUD_URL || 'https://localhost:6379',
  {no_ready_check: true}
);

// parseJob function
var parseJob = function(jobRequest) {
  result = parser(jobRequest.events);
  saveResult(jobRequest, result);
  return result;
};

var saveResult = function(jobRequest, result) {
  client.lpush('results', JSON.stringify({
    input: jobRequest,
    output: result,
    time: new Date()
  }));
};

var background = require('background-process');
background.ready(function(err, options) {
  parseJob(options);
});

// export for testing
module.exports = parseJob;
