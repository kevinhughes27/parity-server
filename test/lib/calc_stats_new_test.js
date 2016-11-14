import fs from 'fs'
import chai from 'chai'
let expect = chai.expect

import calcStats from '../../lib/calc_stats'
let calcStatsNew = calcStats

describe('comparison with old event model', function () {
  [
    'week1_game1',
    'week1_game2',
    'week2_game1',
    'week2_game2'
  ].forEach(function (fileName) {
    it(`matches for game $fileName`, function () {
      let filePath = `test/files/${fileName}.json`
      let input = JSON.parse(fs.readFileSync(filePath))
      let originalOutput = calcStats(input.event_string)
      let newOutput = calcStatsNew(input.event_string)
      expect(newOutput).to.deep.equal(originalOutput)
    })
  })
})
