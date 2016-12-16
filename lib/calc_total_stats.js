import _ from 'lodash'

let calcTotalStats = function (games: Array<any>) {
  let stats = {}

  if (games.length > 0) {
    let lastWeek = games[0].week

    stats = mergeGames(stats, _.filter(games, (g) => g.week === lastWeek))
    stats = addStats(stats, _.filter(games, (g) => g.week !== lastWeek))
  }

  return stats
}

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

module.exports = calcTotalStats
