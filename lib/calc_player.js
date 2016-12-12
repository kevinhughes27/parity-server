// @flow

console.log(process.env.MONGODB_URI)
const Db = require('monk')(process.env.MONGODB_URI)
const Games = Db.get('games')

let calcPlayer = async function (playerName: string) {
  let games = await Games.find({}, {})

  let player = { stats: [], averageSalaryDelta: 0 }

  games.forEach((g) => {
    let playerStats = g.stats[playerName]

    if (playerStats) {
      player.stats.append(playerStats)
      player.averageSalaryDelta += playerStats['SalaryDelta']
    }
  })

  player.averageSalaryDelta = player.averageSalaryDelta / player.stats.length

  return player
}

module.exports = calcPlayer
