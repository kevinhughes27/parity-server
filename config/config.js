import express from 'express'
import morgan from 'morgan'
import bodyParser from 'body-parser'
import path from 'path'

// Load any environment vars in a .env file
require('dotenv').load({silent: true})

// Defaults
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/development'
process.env.PORT = process.env.PORT || 3001

module.exports = function (app) {
  app.use(express.static(path.join(__dirname, '/client')))
  app.use('/static', express.static(path.join(__dirname, '/../client/build/static')))
  app.use('/icons', express.static(path.join(__dirname, '/../client/build/icons')))

  let indexPath = path.join(__dirname, '/../client/build/index.html')
  app.get('/', function (_, res) { res.sendFile(indexPath) })

  if (!process.env.TEST) {
    app.use(morgan('dev'))
  }

  app.use(bodyParser.json())

  app.set('json spaces', 2)
}
