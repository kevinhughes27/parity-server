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

  await createGame(game);

  let stats = calcStats(game.events);
  game.stats = stats;

  let teams = calcTeams(game);
  game.stats = _.merge(game.stats, teams);

  let salaries = calcSalaries(stats, prevWeek);
  game.stats = _.merge(game.stats, salaries);

  await saveGame(game);
  await updateWeek(game.week, game.stats);

  res.status(201).send(game);
});

let createGame = function(game) {
  return games.insert(game);
};

let findWeek = function(weekNum) {
  return weeks.findOne({week: weekNum});
};

let saveGame = function(game) {
  return games.update(
    {_id: game._id},
    {$set: {stats: game.stats}},
  );
};

let updateWeek = async function(weekNum, gameStats) {
  let week = await findWeek(weekNum);
  let weekStats = week ? week.stats : {};
  let stats = _.assign({}, weekStats, gameStats);

  return saveWeek(weekNum, stats);
};

let saveWeek = function(week, stats) {
  weeks.update(
    {week: week},
    {
      $set: {stats: stats},
      $setOnInsert: {week: week}
    },
    {upsert: true}
  );
};

module.exports = router;
