import morgan from 'morgan'
import bodyParser from 'body-parser'

// Load any environment vars in a .env file
require('dotenv').load({silent: true})

// Defaults
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/development'
process.env.PORT = process.env.PORT || 3001

module.exports = function (app) {
  if (!process.env.TEST) {
    app.use(morgan('dev'))
  }

  app.use(bodyParser.json())

  app.set('json spaces', 2)
}
