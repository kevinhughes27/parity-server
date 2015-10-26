var express = require('express'),
    exphbs = require('express-handlebars'),
    bodyParser = require('body-parser'),
    child_process = require('child_process'),
    jsonMarkup = require('json-markup');


// load any environment vars in a .env file
require('dotenv').load();

// connect to Redis
var redis = require('redis');
var client = redis.createClient(
  process.env.REDISCLOUD_URL || 'https://localhost:6379',
  {no_ready_check: true}
);

// create an express instance
var app = express();
var host = process.env.HOST || 'http://localhost';
var port = process.env.PORT || 3000;

// parse the json of incoming requests
app.use(bodyParser.json())

hbs = exphbs.create({
  defaultLayout: 'main',
});

// set handlebars as the templating engine
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');


// index route
app.get('/', function (req, res) {
  console.log('GET /');

  client.lrange('results', 0, -1, function(error, items) {
    items = items.map(function(item){
      item = JSON.parse(item);
      item.input_json = jsonMarkup(item.input, 2);
      item.output_json = jsonMarkup(item.output, 2);
      return item;
    });

    res.render('index', {
      results: items
    });
  });
});


// upload games raw events
app.post('/upload', function(req, res) {
  console.log('POST /upload');

  var job = child_process.spawn('node',
    ['app/parse_job.js', JSON.stringify(req.body)]
  );

  var result;
  job.stdout.on('data', function (data) {
    result = JSON.parse(data);
  });

  job.on('close', function(code) {
    res.status(201).send(result);
    io.emit('new_result', result);
  });
});


// start the server
var server = app.listen(port, function () {
  console.log('Express server listening on port ' + port);
});

// initialize socket.io
var io = require('socket.io').listen(server);

// export for testing
exports.listen = function () {
  server.listen.apply(server, arguments);
};

exports.close = function (callback) {
  server.close(callback);
};
