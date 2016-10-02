import upload from './routes/upload';
import games from './routes/games';
import weeks from './routes/weeks';

module.exports = function(app) {
  app.use('/', upload);
  app.use('/', games);
  app.use('/', weeks);
}
