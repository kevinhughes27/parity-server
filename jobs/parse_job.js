require('dotenv').load();

var _ = require('lodash');
var db = require('mongoskin').db(process.env.MONGODB_URI);
var games = db.collection('games');
var weeks = db.collection('weeks');

var parser = require('parity-parser');
var calcSalaries = require('../lib/calc_salaries');

var execute = function(game, callback) {
  stats = parser(game.events);
  salaraDeltas = calcSalaries(stats);
  stats = _.merge(stats, salaraDeltas);

  saveGame(game, stats);
  saveWeek(game.week, stats);

  return stats;
};

var saveGame = function(game, stats) {
  games.updateById(
    game._id,
    {$set: {stats: stats}}
  );
};

var saveWeek = function(week, gameStats) {
  weeks.findOne({week: week}, function(err, w) {
    weekStats = w ? w.stats : {};
    stats = _.assign({}, weekStats, gameStats);
    _saveWeek(week, stats);
  });
};

var _saveWeek = function(week, stats) {
  weeks.update(
    {week: week},
    {
      $set: {stats: stats},
      $setOnInsert: {week: week}
    },
    {upsert: true}
  );
};

var background = require('background-process');
background.ready(function(err, options) {
  execute(options);
  db.close()
});

// export for testing
module.exports = execute;
