import _ from 'lodash'

let calcTeams = function (game) {
  let teams = initDefaultTeam(game.stats, 'Substitute')

  _.mapKeys(game.teams, (players, team) => {
    _.map(players, (player) => { teams[player] = {Team: team} })
  })

  return teams
}

let initDefaultTeam = function (stats, defaultTeam) {
  return _.mapValues(stats, function (playerStats, playerName) {
    return {Team: defaultTeam}
  })
}

module.exports = calcTeams
