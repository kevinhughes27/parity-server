var express = require('express');
var app = express();

app.get('/', function (req, res) {
  res.send('ParityServer!');
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('ParityServer listening at http://%s:%s', host, port);
});
