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
 * @api {post} /upload Upload Game Events
 * @apiName PostUpload
 * @apiGroup Events
 *
 * @apiParam {Object} Game upload from the stat keeper client app.
 *
 * @apiSuccess (204)
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
