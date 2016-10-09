import express from 'express';
let router = express.Router();

const db = require('monk')(process.env.MONGODB_URI)
const games = db.get('games');
const weeks = db.get('weeks');

import _ from 'lodash';
import calcStats from '../lib/calc_stats';
import calcSalaries from '../lib/calc_salaries';
import calcTeams from '../lib/calc_teams'

/**
 * @api {post} /upload Upload Game Events
 * @apiName PostUpload
 * @apiGroup Events
 *
 * @apiParam {Object} Game upload from the stat keeper client app.
 *
 * @apiSuccess (204)
 */
router.post('/upload', async function(req, res) {
  let game = { ...req.body, time: new Date() };

  let prevWeekNum = game.week - 1;
  let prevWeek = await findWeek(prevWeekNum);

  createGame(game, function(err, result) {
    let stats = calcStats(game.events);
    game.stats = stats;

    let teams = calcTeams(game);
    game.stats = _.merge(game.stats, teams);

    let salaries = calcSalaries(stats, prevWeek);
    game.stats = _.merge(game.stats, salaries);

    save(game, function(err, result) {
      res.status(201).send(game);
    });
  });
});

let findWeek = function(weekNum) {
  return weeks.findOne({week: weekNum});
};

let createGame = function(game, callback) {
  games.insert(game, callback);
};

let save = function(game, callback) {
  saveGame(game, function(err, result) {
    saveWeek(game.week, game.stats, callback);
  });
}

let saveGame = function(game, callback) {
  games.update(
    {_id: game._id},
    {$set: {stats: game.stats}},
    callback
  );
};

let saveWeek = function(week, gameStats, callback) {
  weeks.findOne({week: week}, function(err, w) {
    let weekStats = w ? w.stats : {};
    let stats = _.assign({}, weekStats, gameStats);
    _saveWeek(week, stats, callback);
  });
};

let _saveWeek = function(week, stats, callback) {
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
