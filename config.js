import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';

// Load any environment vars in a .env file
require('dotenv').load();

module.exports = function(app) {
  app.use(express.static(__dirname + "/public"));
  app.use('/static', express.static(__dirname + "/public/build/static"));

  let indexPath = __dirname + "/public/build/index.html";
  app.get('/', function (_, res) { res.sendFile(indexPath) });

  if(!process.env.TEST) {
    app.use(morgan('dev'));
  }

  app.use(bodyParser.json());

  app.set('json spaces', 2);
}
