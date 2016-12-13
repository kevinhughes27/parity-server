// @flow

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

    player.stats.push(playerStats)
    player.prevSalary = playerStats['Salary']
    player.averageDelta += playerStats['SalaryDelta']
  })

  if (player.averageDelta > 0) {
    player.averageDelta = player.averageDelta / player.stats.length
  }

  return player
}

module.exports = calcPlayer
