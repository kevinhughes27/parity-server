var express = require('express');
var router = express.Router();

var _ = require('lodash');
var db = require('mongoskin').db(process.env.MONGODB_URI);
var games = db.collection('games');
var weeks = db.collection('weeks');

var parser = require('parity-parser');
var calcSalaries = require('../lib/calc_salaries');

/**
 * @api {post} /upload Upload Game Events
 * @apiName PostUpload
 * @apiGroup Events
 *
 * @apiParam {Array} events Array of Game Events.
 *
 * @apiSuccess (204)
 */
router.post('/upload', function(req, res) {
  game = req.body;
  game.time = new Date();

  createGame(game, function(err, result) {
    stats = parser(game.events);
    salaraDeltas = calcSalaries(stats);
    stats = _.merge(stats, salaraDeltas);

    saveGame(game, stats, function(err, result) {
      saveWeek(game.week, stats, function(err, result) {
        res.status(201).send(game);
      });
    });
  });
});

var createGame = function(game, callback) {
  games.insert(game, callback);
};

var saveGame = function(game, stats, callback) {
  game.stats = stats;

  games.updateById(
    game._id,
    {$set: {stats: stats}},
    callback
  );
};

var saveWeek = function(week, gameStats, callback) {
  weeks.findOne({week: week}, function(err, w) {
    weekStats = w ? w.stats : {};
    stats = _.assign({}, weekStats, gameStats);
    _saveWeek(week, stats, callback);
  });
};

var _saveWeek = function(week, stats, callback) {
  weeks.update(
    {week: week},
    {
      $set: {stats: stats},
      $setOnInsert: {week: week}
    },
    {upsert: true},
    callback
  );
};

module.exports = router;
