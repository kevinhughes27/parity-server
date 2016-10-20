import upload from '../routes/upload'
import teams from '../routes/teams'
import games from '../routes/games'
import weeks from '../routes/weeks'

module.exports = function (app) {
  app.use('/', upload)
  app.use('/', teams)
  app.use('/', games)
  app.use('/', weeks)
}
