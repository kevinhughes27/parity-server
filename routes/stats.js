// @flow

import express from 'express'
let router = express.Router()

const Db = require('monk')(process.env.MONGODB_URI)
const Games = Db.get('games')

import _ from 'lodash'
import getTeams from '../lib/teams_cache'
import calcTotalStats from '../lib/calc_total_stats'

/**
 * @api {get} /stats Cumulative
 * @apiGroup Weeks
 * @apiDescription Returns the summed stats for all weeks keeping the latest salary.
 * This response is calculated by summing all the games.
 * @apiSuccess (200) {Object} stats returns the summed stats for all weeks
 * @apiSuccessExample {json} Example Response:
 *    {
 *      "stats": {
 *        "Al Colantonio": {"Pulls": 2, "SalaryDelta": 2000, "Salary": 50000}
 *      }
 *    }
 */
router.get('/stats', async function (req, res) {
  let games = await Games.find({}, {sort: {week: -1}})
  let stats = calcTotalStats(games)
  stats = updateTeams(stats)
  res.json({stats})
})

let updateTeams = function (stats) {
  let teams = getTeams()
  let playerTeams = {}

  _.mapValues(teams, (team, teamName) => {
    _.map(team.players, (player) => { playerTeams[player] = {Team: teamName} })
  })

  return _.merge(stats, playerTeams)
}

module.exports = router
