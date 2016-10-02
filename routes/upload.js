import express from 'express';
let router = express.Router();

import _ from 'lodash';

let db = require('mongoskin').db(process.env.MONGODB_URI);
let games = db.collection('games');
let weeks = db.collection('weeks');

import parser from 'parity-parser';
import calcSalaries from '../lib/calc_salaries';

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
  let game = req.body;
  game.time = new Date();

  createGame(game, function(err, result) {
    let stats = parser(game.events);
    let salaraDeltas = calcSalaries(stats);
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
    let weekStats = w ? w.stats : {};
    let stats = _.assign({}, weekStats, gameStats);
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
