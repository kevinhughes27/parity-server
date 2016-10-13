// @flow

import _ from 'lodash'

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

const defaultSalary = 500000
const defaultSalaryDelta = 100000

let calcSalaries = function (stats: any, prevWeek: any) {
  let playerSalaries = {}

  _.mapValues(stats, function (playerStats, playerName) {
    let salaryDelta = calcSalaryDelta(playerStats)

    if (salaryDelta === 0) {
      salaryDelta = defaultSalaryDelta
    }

    let salary = previousSalary(prevWeek, playerName) + salaryDelta

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

let previousSalary = function (prevWeek, playerName) {
  if (!prevWeek) return defaultSalary

  let player = prevWeek.stats[playerName]
  if (!player) return defaultSalary

  return player['Salary']
}

module.exports = calcSalaries
