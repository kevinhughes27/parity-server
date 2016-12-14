// @flow

import _ from 'lodash'
import calcPlayer from './calc_player'

const playValues = {
  'Goals': 10000,
  'Assists': 10000,
  '2nd Assist': 8000,
  '3rd Assist': 0,
  '4th Assist': 0,
  '5th Assist': 0,
  'D-Blocks': 8000,
  'Throwaways': -5000,
  'Drops': -5000,
  'ThrewDrop': -2500,
  'Completions': 1000,
  'Pick-Ups': 0,
  'Catches': 1000,
  'Pulls': 0,
  'Calihan': 0,
  'OPointsFor': 0,
  'OPointsAgainst': 0,
  'DPointsFor': 0,
  'DPointsAgainst': 0
}

let calcSalaries = function (stats: any, games: Array<any>) {
  let playerSalaries = {}
  let weekNum = _.max(_.map(games, (g) => g.week))

  _.mapValues(stats, function (playerStats, playerName) {
    let player = calcPlayer(playerName, games)
    let salaryDelta = calcSalaryDelta(playerStats)

    // player was absent
    if (salaryDelta === 0) {
      salaryDelta = player.averageDelta
    }

    // no history for the player
    if (salaryDelta === 0) {
      salaryDelta = averageSalaryDelta(stats, playerStats['Team'])
    }

    // new player, not week 1
    if (player.prevSalary === 500000 && weekNum > 1) {
      player.prevSalary += salaryDelta * (weekNum - 1)
    }

    let salary = player.prevSalary + salaryDelta

    playerSalaries[playerName] = {
      'SalaryDelta': salaryDelta,
      'Salary': salary
    }
  })

  return playerSalaries
}

let calcSalaryDelta = function (playerStats) {
  let values = _.mapValues(playValues, function (playValue, play) {
    let playCount = playerStats[play] || 0
    return playCount * playValue
  })
  values = _.values(values)
  return _.sum(values)
}

let averageSalaryDelta = function (stats, team) {
  let teamStats = _.filter(stats, (s) => s['Team'] === team)

  let nonZeroDeltas = []

  _.mapValues(teamStats, function (playerStats, playerName) {
    let delta = calcSalaryDelta(playerStats)
    if (delta !== 0) nonZeroDeltas.push(delta)
  })

  return _.sum(nonZeroDeltas) / nonZeroDeltas.length
}

module.exports = calcSalaries
