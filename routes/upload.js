// @flow

import express from 'express'
let router = express.Router()

const Db = require('monk')(process.env.MONGODB_URI)
const Games = Db.get('games')

import _ from 'lodash'
import calcStats from '../lib/calc_stats'
import calcSalaries from '../lib/calc_salaries'
import calcTeams from '../lib/calc_teams'
import calcWeekNum from '../lib/calc_week_num'

/**
 * @api {post} /upload From Stats Keeper Client
 * @apiGroup Upload
 * @apiDescription This is only path which creates new data on the server.
 * The Stats Keeper Client uploads the stats to this endpoint and the server
 * does any required post-processing before saving the game to the database.
 *
 * @apiParam {String} league the name of the league
 * @apiParam {Number} week the week number of the game
 * @apiParam {Object} teams a key for each team containing an array of player names
 * @apiParam {Array} event_string the array of events recored by the client
 *
 * @apiParamExample {json} Example Upload:
 *     {
 *       "league": "ocua_16",
 *       "week": 1,
 *       "teams": {
 *         "Karma Down Under": ["Alison Ward"],
 *         "Kindha's Ongoing Disappointments": ["Jen Cluthe"]
 *       },
 *       "event_string": [
 *         "Pull,Al Colantonio"
 *       ]
 *     }
 */
router.post('/upload', async function (req, res) {
  let game = {...req.body, time: new Date()}
  game.week = game.week || calcWeekNum(new Date())

  await createGame(game)

  let stats = calcStats(game.event_string)
  game.stats = stats

  // add the players current team to the stats object
  let playerTeams = calcTeams(game.teams, game.stats)
  game.stats = _.merge(game.stats, playerTeams)

  // games sorted from week 1 to N
  let games = await Games.find({}, {sort: { week: 1 }})

  // use the stats to calculate each players salary
  let playerSalaries = calcSalaries(stats, games)
  game.stats = _.merge(game.stats, playerSalaries)

  // apply any adjusments for new players
  // this should only be used when someone misses the first
  // game after they join midway through. Or if a salary is
  // needed before the player has played.
  if (game.player_adjustments) {
    let adjustments = game.player_adjustments
    game.stats = _.merge(game.stats, adjustments)
  }

  await saveGame(game)

  res.status(201).send(game)
})

let createGame = function (game) {
  return Games.insert(game)
}

let saveGame = function (game) {
  return Games.update(
    {_id: game._id},
    {$set: {stats: game.stats}},
  )
}

module.exports = router
