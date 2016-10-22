// @flow

import express from 'express'
let router = express.Router()

import _ from 'lodash'

const Db = require('monk')(process.env.MONGODB_URI)
const Games = Db.get('games')

/**
 * @api {get} /stats Cumulative stats
 * @apiName GetStats
 * @apiGroup Stats
 *
 * @apiSuccess (200)
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
    stats[playerName][statName] += statValue
  })

  return stats
}

module.exports = router
