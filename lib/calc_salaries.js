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

  _.mapValues(stats, function (playerStats, playerName) {
    let player = calcPlayer(playerName, games)
    let salaryDelta = calcSalaryDelta(playerStats)

    if (gameNotPlayed(salaryDelta)) {
      salaryDelta = player.averageDelta
    }

    let salary = player.prevSalary + salaryDelta

    playerSalaries[playerName] = {
      'SalaryDelta': salaryDelta,
      'Salary': salary
    }
  })

  return playerSalaries
}

let gameNotPlayed = function (salaryDelta) {
  return salaryDelta === 0
}

let calcSalaryDelta = function (playerStats) {
  let values = _.mapValues(playValues, function (playValue, play) {
    let playCount = playerStats[play] || 0
    return playCount * playValue
  })
  values = _.values(values)
  return _.sum(values)
}

module.exports = calcSalaries
