import path from 'path'
import express from 'express'

import upload from '../routes/upload'
import teams from '../routes/teams'
import games from '../routes/games'
import weeks from '../routes/weeks'
import stats from '../routes/stats'

let clientPath = path.join(__dirname, '/../client/build')
let docsPath = path.join(__dirname, '/../docs/')

module.exports = function (app) {
  app.use('/', express.static(clientPath))
  app.use('/docs', express.static(docsPath))

  // API
  app.use('/', upload)
  app.use('/', teams)
  app.use('/', games)
  app.use('/', weeks)
  app.use('/', stats)
}
