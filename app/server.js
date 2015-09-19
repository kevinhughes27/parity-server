var express = require('express');
var bodyParser = require('body-parser')
var child_process = require('child_process');

require('dotenv').load();

var redis = require('redis');
var client = redis.createClient(
  process.env.REDISCLOUD_URL,
  {no_ready_check: true}
);

var app = express();
app.use(bodyParser.json())

// index route
app.get('/', function (req, res) {
  console.log('GET /');

  client.lrange('results', 0, -1, function(error, items) {
    res.send(items);
  });
});

// upload event string route
app.post('/upload', function(req, res) {
  console.log('POST /upload');

  var eventString = req.body.event_string;
  var job = child_process.spawn('node',
    ['app/parse_job.js', eventString]
  );

  var result;
  job.stdout.on('data', function (data) {
    result = data;
  });

  job.on('close', function(code) {
    res.status(201);
    res.send(result); // any way to combine these 2 lines?
  });
});

// Start the server
var server = app.listen(3000, function () {
  host = server.address().address;
  port = server.address().port;

  console.log('Server listening at http://%s:%s', host, port);
});

// Export for testing
exports.listen = function () {
  server.listen.apply(server, arguments);
};

exports.close = function (callback) {
  server.close(callback);
};
