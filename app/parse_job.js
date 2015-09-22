var parser = require('../app/parser').parser;

require('dotenv').load();

var redis = require('redis');
var client = redis.createClient(
  process.env.REDISCLOUD_URL || 'https://localhost:6379',
  {no_ready_check: true}
);

// parseJob function
var parseJob = exports.parseJob = function(eventString) {
  result = parser(eventString);
  saveResult(eventString, result);
  process.stdout.write(result);
};

var saveResult = function(eventString, result) {
  record = JSON.stringify({
    input: eventString,
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
