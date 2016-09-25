// Load any environment vars in a .env file
require('dotenv').load();

var express = require('express'),
    morgan = require('morgan'),
    exphbs = require('express-handlebars'),
    bodyParser = require('body-parser');

var db = require('monk')(process.env.MONGODB_URI);

// Init express
var app = new express();
app.use(morgan('dev'));
app.use(bodyParser.json());
app.set('json spaces', 2);

// Init handlebars
hbs = exphbs.create({
  defaultLayout: 'main',
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// Connect routes
var index = require('./routes/index');
app.use('/', index);

var games = require('./routes/games');
app.use('/', games);

var upload = require('./routes/upload');
app.use('/', upload);

// Start the server
var server = app.listen(process.env.PORT, function () {
  var port = server.address().port;
  console.log('Express server listening on port ' + port);
});

// Export for testing
exports.listen = function () {
  server.listen.apply(server, arguments);
};

exports.close = function (callback) {
  server.close(callback);
};
