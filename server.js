var express = require('express'),
    exphbs = require('express-handlebars'),
    bodyParser = require('body-parser');

// load any environment vars in a .env file
require('dotenv').load();

// create an express instance
var app = express();
var host = process.env.HOST || 'http://localhost';
var port = process.env.PORT || 3000;

// connect to Redis
var redis = require('redis');
var redisClient = redis.createClient(
  process.env.REDISCLOUD_URL || 'https://localhost:6379',
  {no_ready_check: true}
);
app.set('redisClient', redisClient);

// parse the json of incoming requests
app.use(bodyParser.json())

hbs = exphbs.create({
  defaultLayout: 'main',
});

// set handlebars as the templating engine
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

var index = require('./routes/index');
app.use('/', index);

var upload = require('./routes/upload');
app.use('/', upload);

// start the server
var server = app.listen(port, function () {
  console.log('Express server listening on port ' + port);
});

// export for testing
exports.listen = function () {
  server.listen.apply(server, arguments);
};

exports.close = function (callback) {
  server.close(callback);
};
