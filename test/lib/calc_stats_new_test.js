import _ from 'lodash'
import fs from 'fs'
import chai from 'chai'
let expect = chai.expect

import calcStats from '../../lib/calc_stats'
import calcStatsNew from '../../lib/calc_stats_new'

describe('comparison with old event model', function () {
  let testCases = [
    'week01_game1',
    'week01_game2',
    'week02_game1',
    'week02_game2'
  ]

  for (let testCase of testCases) {
    it(`matches for game ${testCase}`, function () {
      let filePath = `db/${testCase}.json`
      let input = JSON.parse(fs.readFileSync(filePath))

      let numPoints = input.points.length
      for (let n = 1; n <= numPoints; n++) {
        upToPointTestCase(input, n)
      }
    })
  }
})

function upToPointTestCase (input, n) {
  let eventString = firstNPointsString(input.event_string, n)
  // console.log(eventString)
  let originalOutput = calcStats(eventString)

  let points = firstNPoints(input.points, n)
  // console.log(points)
  let newOutput = calcStatsNew(points)

  // compare all one by one with error message
  _.mapKeys(newOutput, (value, key) => {
    expect(value).to.deep.equal(originalOutput[key],
      `player ${key}'s stats did not match after ${n} points'`)
  })
}

function firstNPointsString (eventString, n) {
  let numPoints = 0
  let rowMax = 0

  eventString.forEach((line, idx) => {
    if (line.split(',')[0] === 'POINT' && numPoints < n) {
      rowMax = idx
      numPoints += 1
    }
  })

  rowMax += 13 // add the trailing on field lines

  return eventString.slice(0, rowMax)
}

function firstNPoints (points, n) {
  return points.slice(0, n)
}
