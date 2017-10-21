// @flow

import _ from 'lodash'

let calcTeams = function (teams: any, stats: any) {
  let playerTeams = initDefaultTeam(stats, 'Substitute')

  _.mapKeys(teams, (players, team) => {
    _.map(players, (player) => { playerTeams[player] = {Team: team} })
  })

  return playerTeams
}

let initDefaultTeam = function (stats, defaultTeam) {
  return _.mapValues(stats, function (playerStats, playerName) {
    return {Team: defaultTeam}
  })
}

module.exports = calcTeams
