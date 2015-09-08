var express = require('express');
var app = express();

var spawn = require('child_process').spawn


app.get('/', function (req, res) {
  res.send('ParityServer!');
});


app.post('/upload', function(req, res) {
  var job = spawn('node', ['app/upload_job.js'], {
    detached: true,
    stdio: [process.stdin, process.stdout, process.stderr]
  });

  job.on('close', function(code) {
    res.status(201)
    res.send('done.');
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
