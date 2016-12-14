// @flow

import _ from 'lodash'

const defaultSalary = 500000

let calcPlayer = function (playerName: string, games: Array<any>) {
  let player = {
    stats: [],
    prevSalary: defaultSalary,
    averageDelta: 0
  }

  games.forEach((g) => {
    if (!g.stats) return

    let playerStats = g.stats[playerName]
    if (!playerStats) return

    player.prevSalary = playerStats['Salary']

    // only use games they actually played when calculating their average
    if (_.size(playerStats) <= 3) return
    player.stats.push(playerStats)
    player.averageDelta += playerStats['SalaryDelta']
  })

  if (player.averageDelta > 0) {
    player.averageDelta = player.averageDelta / player.stats.length
  }

  return player
}

module.exports = calcPlayer
