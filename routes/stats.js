// @flow

import express from 'express'
let router = express.Router()

import _ from 'lodash'

const Db = require('monk')(process.env.MONGODB_URI)
const Games = Db.get('games')

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

  let stats = {}

  if (games.length > 0) {
    let lastWeek = games[0].week

    stats = mergeGames(stats, _.filter(games, (g) => g.week === lastWeek))
    stats = addStats(stats, _.filter(games, (g) => g.week !== lastWeek))
  }

  res.json({stats})
})

let mergeGames = function (stats, games) {
  _.each(games, (g) => {
    _.merge(stats, g.stats)
  })

  return stats
}

let addStats = function (stats, games) {
  _.each(games, (g) => {
    _.mapValues(g.stats, (playerStats, playerName) => {
      _addStats(stats, playerStats, playerName)
    })
  })

  return stats
}

let _addStats = function (stats, playerStats, playerName) {
  let omitKeys = ['Team', 'Salary', 'SalaryDelta']

  _.mapValues(playerStats, (statValue, statName) => {
    // key should not be added
    if (_.includes(omitKeys, statName)) return

    stats[playerName] = stats[playerName] || {}
    stats[playerName][statName] = stats[playerName][statName] || 0
    stats[playerName][statName] += statValue
  })

  // these keys are usually taken from the last week but this
  // may need be when they subbed so we should always copy it.
  if (playerStats['Team'] === 'Substitute') {
    stats[playerName]['Team'] = 'Substitute'
  }

  return stats
}

module.exports = router
