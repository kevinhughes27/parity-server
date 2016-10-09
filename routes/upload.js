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
router.post('/upload', function(req, res) {
  let game = { ...req.body, time: new Date() };

  let prevWeekNum = game.week - 1;

  previousWeek(prevWeekNum, function(err, prevWeek) {
    createGame(game, function(err, result) {
      let stats = calcStats(game.events);

      setDefaultTeam(stats, 'Substitute');
      let teams = calcTeams(game);
      stats = _.merge(stats, teams);

      let salaries = calcSalaries(stats, prevWeek);
      stats = _.merge(stats, salaries);

      save(game, stats, function(err, result) {
        res.status(201).send(game);
      });
    });
  });
});

let previousWeek = function(prevWeek, callback) {
  weeks.findOne({week: prevWeek}, callback);
};

let setDefaultTeam = function(stats, defaultTeam) {
  _.each(stats, (player) => { player.Team = defaultTeam} );
};

let createGame = function(game, callback) {
  games.insert(game, callback);
};

let save = function(game, stats, callback) {
  saveGame(game, stats, function(err, result) {
    saveWeek(game.week, stats, callback);
  });
}

let saveGame = function(game, stats, callback) {
  game.stats = stats;

  games.update(
    {_id: game._id},
    {$set: {stats: stats}},
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
