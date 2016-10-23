// @flow

import express from 'express'
let router = express.Router()

const Db = require('monk')(process.env.MONGODB_URI)
const Games = Db.get('games')

import _ from 'lodash'
import calcStats from '../lib/calc_stats'
import calcSalaries from '../lib/calc_salaries'
import calcTeams from '../lib/calc_teams'
import calcWeek from '../lib/calc_week'

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
 * @apiParam {Array} events the array of events recored by the client
 *
 * @apiParamExample {json} Example Upload:
 *     {
 *       "league": "ocua_16",
 *       "week": 1,
 *       "teams": {
 *         "Karma Down Under": ["Alison Ward"],
 *         "Kindha's Ongoing Disappointments": ["Jen Cluthe"]
 *       },
 *       "events": [
 *         "Pull\tAl Colantonio"
 *       ]
 *     }
 */
router.post('/upload', async function (req, res) {
  let game = { ...req.body, time: new Date() }
  await createGame(game)

  let prevWeekNum = game.week - 1
  let prevWeek = await calcWeek(prevWeekNum)

  let stats = calcStats(game.events)
  game.stats = stats

  let playerTeams = calcTeams(game.teams, game.stats)
  game.stats = _.merge(game.stats, playerTeams)

  let playerSalaries = calcSalaries(stats, prevWeek)
  game.stats = _.merge(game.stats, playerSalaries)

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
