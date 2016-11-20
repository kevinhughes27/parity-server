import _ from 'lodash'
import fs from 'fs'
import chai from 'chai'
let expect = chai.expect

import calcStats from '../../lib/calc_stats'
import calcStatsNew from '../../lib/calc_stats_new'

describe('comparison with old event model', function () {
  [
    // 'week1_game1',
    // 'week1_game2',
    // 'week2_game1',
    'week2_game2'
  ].forEach(function (fileName) {
    it(`matches for game ${fileName}`, function () {
      let filePath = `test/files/${fileName}.json`
      let input = JSON.parse(fs.readFileSync(filePath))
      let originalOutput = calcStats(input.event_string)
      let newOutput = calcStatsNew(input.points)

      // compare player
      // let player = 'Brian Kells'
      // expect(newOutput[player]).to.deep.equal(originalOutput[player])

      // compare all
      // expect(newOutput).to.deep.equal(originalOutput)

      // compare all one by one with error message
      _.mapKeys(newOutput, (value, key) => {
        expect(value).to.deep.equal(originalOutput[key], key)
      })
    })
  })

  it('matches for point', function () {
    let points = [
      {
        'offensePlayers': [
          'Jeff Hunt',
          'Christopher Keates',
          'Matthew Schijns',
          'David Townsend',
          'Melissa Berry',
          'Sandra Hanson'
        ],
        'events': [
          {
            'type': 'PULL',
            'timestamp': 'Nov 7, 2016 7:05:51 PM',
            'firstActor': 'Sina Dee(S)'
          },
          {
            'type': 'PASS',
            'timestamp': 'Nov 7, 2016 7:05:58 PM',
            'secondActor': 'Sandra Hanson',
            'firstActor': 'Christopher Keates'
          },
          {
            'type': 'PASS',
            'timestamp': 'Nov 7, 2016 7:06:03 PM',
            'secondActor': 'Christopher Keates',
            'firstActor': 'Sandra Hanson'
          },
          {
            'type': 'PASS',
            'timestamp': 'Nov 7, 2016 7:06:05 PM',
            'secondActor': 'Matthew Schijns',
            'firstActor': 'Christopher Keates'
          },
          {
            'type': 'DROP',
            'timestamp': 'Nov 7, 2016 7:06:07 PM',
            'firstActor': 'Matthew Schijns'
          },
          {
            'type': 'PASS',
            'timestamp': 'Nov 7, 2016 7:06:13 PM',
            'secondActor': 'Ashlin Kelly(S)',
            'firstActor': 'Sina Dee(S)'
          },
          {
            'type': 'POINT',
            'timestamp': 'Nov 7, 2016 7:06:14 PM',
            'firstActor': 'Ashlin Kelly(S)'
          }
        ],
        'defensePlayers': [
          'Brian Kells',
          'Alessandro Colonnier',
          'Will Leckie',
          'Heather McCabe',
          'Ashlin Kelly(S)',
          'Sina Dee(S)'
        ]
      }
    ]

    let eventString = [
      '',
      'Pull,Sina Dee(S),',
      'Direction,<<<<<<,',
      'Drop,Matthew Schijns,Pass,Christopher Keates,Pass,Sandra Hanson,Pass,Christopher Keates,',
      'Direction,>>>>>>,',
      'POINT,Ashlin Kelly(S),Pass,Sina Dee(S),',
      '+1,Brian Kells,',
      '+1,Alessandro Colonnier,',
      '+1,Will Leckie,',
      '+1,Heather McCabe,',
      '+1,Ashlin Kelly(S),',
      '+1,Sina Dee(S),',
      '-1,Jeff Hunt,',
      '-1,Christopher Keates,',
      '-1,Matthew Schijns,',
      '-1,David Townsend,',
      '-1,Melissa Berry,',
      '-1,Sandra Hanson,',
      'Direction,<<<<<<,'
    ]

    let originalOutput = calcStats(eventString)
    let newOutput = calcStatsNew(points)

    // compare player
    let player = 'Brian Kells'
    expect(newOutput[player]).to.deep.equal(originalOutput[player])
    expect(newOutput[player]['DPointsFor']).to.equal(1)
    expect(originalOutput[player]['DPointsFor']).to.equal(1)

    // compare all
    // expect(newOutput).to.deep.equal(originalOutput)

    // compare all one by one with error message
    _.mapKeys(newOutput, (value, key) => {
      expect(value).to.deep.equal(originalOutput[key], key)
    })
  })
})
