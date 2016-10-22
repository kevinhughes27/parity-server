// @flow

import 'babel-polyfill'
import express from 'express'
import configure from './config/config'
import addRoutes from './config/routes'

// Init express
const app = express()

// Configure
configure(app)
addRoutes(app)

// Start the server
let port = process.env.PORT || 3001
let server = app.listen(port, function () {
  console.log('Express server listening on port ' + port)
})

// Export for testing
exports.listen = function () {
  server.listen.apply(server, arguments)
}

exports.close = function (callback: any) {
  server.close(callback)
}
