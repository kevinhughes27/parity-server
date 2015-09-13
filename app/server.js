var express = require('express');
var bodyParser = require('body-parser')
var child_process = require('child_process');

var app = express();

app.use(bodyParser.json())

app.get('/', function (req, res) {
  res.send('ParityServer!');
});

app.post('/upload', function(req, res) {
  var eventString = req.body.event_string;
  var job = child_process.spawn('node', ['app/parse_job.js', eventString]);

  var result;
  job.stdout.on('data', function (data) {
    result = data;
  });

  job.on('close', function(code) {
    res.status(201);
    res.send(result);
  });
});


var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Server listening at http://%s:%s', host, port);
});

exports.listen = function () {
  server.listen.apply(server, arguments);
};

exports.close = function (callback) {
  server.close(callback);
};
