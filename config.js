import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';

// Load any environment vars in a .env file
require('dotenv').load();

module.exports = function(app) {
  app.use(express.static(__dirname + "/public"));

  if(!process.env.TEST) {
    app.use(morgan('dev'));
  }

  app.use(bodyParser.json());

  app.set('json spaces', 2);
}
