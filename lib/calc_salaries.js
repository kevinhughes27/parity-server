// @flow

import _ from 'lodash'
import calcWeek from './calc_week'
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

const defaultSalary = 500000

let calcSalaries = async function (stats: any, prevWeekNum) {
  let playerSalaries = {}
  let prevWeek = await calcWeek(prevWeekNum)

  _.mapValues(stats, function (playerStats, playerName) {
    let salaryDelta = calcSalaryDelta(playerStats)

    if (_gameNotPlayed(salaryDelta)) {
      salaryDelta = calcPlayer(playerName).averageSalaryDelta
    }

    let salary = previousSalary(prevWeek, playerName) + salaryDelta

    playerSalaries[playerName] = {
      'SalaryDelta': salaryDelta,
      'Salary': salary
    }
  })

  return playerSalaries
}

let _gameNotPlayed = function (salaryDelta) {
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

let previousSalary = function (prevWeek, playerName) {
  if (!prevWeek) return defaultSalary

  let player = prevWeek.stats[playerName]
  if (player) return player['Salary']

  // new player and it is not week 1
  return prevAverageSalary(prevWeek)
}

let prevAverageSalary = function (prevWeek) {
  let nonZeroValues = []

  _.mapValues(prevWeek.stats, function (playerStats, playerName) {
    if (playerStats['Salary']) nonZeroValues.push(playerStats['Salary'])
  })

  return _.sum(nonZeroValues) / nonZeroValues.length
}

module.exports = calcSalaries
