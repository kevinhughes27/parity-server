var express = require('express');
var bodyParser = require('body-parser')
var child_process = require('child_process');

var app = express();
app.use(bodyParser.json())

// index route
app.get('/', function (req, res) {
  // display all job records
  // open a socket to auto refresh with new records
  res.send('ParityServer!');
});

// upload event string route
app.post('/upload', function(req, res) {
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
