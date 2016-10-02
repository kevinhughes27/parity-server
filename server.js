"use-strict";
import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';

// Load any environment vars in a .env file
require('dotenv').load();

let db = require('monk')(process.env.MONGODB_URI);

// Init express
let app = new express();
app.use(express.static(__dirname + "/public"));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.set('json spaces', 2);

// Connect routes
import upload from './routes/upload';
app.use('/', upload);

import games from './routes/games';
app.use('/', games);

import weeks from './routes/weeks';
app.use('/', weeks);

// Start the server
let server = app.listen(process.env.PORT, function() {
  let port = server.address().port;
  console.log('Express server listening on port ' + port);
});

// Export for testing
exports.listen = function() {
  server.listen.apply(server, arguments);
};

exports.close = function(callback) {
  server.close(callback);
};
