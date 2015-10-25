var _ = require('underscore');
var parser = require('../app/parser').parser;

require('dotenv').load();

var redis = require('redis');
var client = redis.createClient(
  process.env.REDISCLOUD_URL || 'https://localhost:6379',
  {no_ready_check: true}
);

// parseJob function
var parseJob = exports.parseJob = function(jobRequest) {
  jobRequest = JSON.parse(jobRequest);

  var result = {};
  jobRequest.games.forEach(function(game) {
    result = _.extend(result, parser(game.events));
  });

  saveResult(jobRequest, result);
  process.stdout.write(JSON.stringify(result));
};

var saveResult = function(jobRequest, result) {
  record = JSON.stringify({
    input: jobRequest,
    output: result,
    time: new Date()
  });

  client.lpush('results', record, function(err, reply) {
    process.stdout.write(reply)
  });
};

// after the redis connection is established
// collect args and call the main function
// before terminating the process
client.on('ready', function() {
  var eventString = process.argv[2];
  parseJob(eventString);
  process.exit(0);
});
