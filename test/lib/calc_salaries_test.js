import chai from 'chai'
let expect = chai.expect

chai.use(require('sinon-chai'))

import calcSalaries from '../../lib/calc_salaries'

describe('calcSalaries', function () {
  let stats = {
    'Mike': {
      'Goals': 1
    }
  }

  let games = [
    {
      week: 1,
      stats: {
        'Jill': {'Team': 'Katy Parity', 'D': 1, 'SalaryDelta': 5000, 'Salary': 100000},
        'Mike': {'Team': 'Beans', 'Goals': 1, 'SalaryDelta': 10000, 'Salary': 500000}
      }
    }
  ]

  it('increase for goals', function () {
    let salaryDeltas = calcSalaries(stats, [])
    expect(salaryDeltas['Mike']['SalaryDelta']).to.equal(10000)
  })

  it('decrease for drops', function () {
    stats['Mike'] = { 'Drops': 1 }
    let salaryDeltas = calcSalaries(stats, [])
    expect(salaryDeltas['Mike']['SalaryDelta']).to.equal(-5000)
  })

  it('gives the default for initial salary', function () {
    stats['Mike'] = { 'Drops': 1 }
    let salaryDeltas = calcSalaries(stats, [])
    expect(salaryDeltas['Mike']['Salary']).to.equal(495000)
  })

  it('adds delta to previous salary', function () {
    stats['Mike'] = { 'Drops': 1 }
    let salaryDeltas = calcSalaries(stats, games)
    expect(salaryDeltas['Mike']['Salary']).to.equal(495000)
  })

  it('gives a player their average salary delta if they are absent', function () {
    stats['Mike'] = {'Team': 'Beans'}
    let salaryDeltas = calcSalaries(stats, games)
    expect(salaryDeltas['Mike']['SalaryDelta']).to.equal(10000)
    expect(salaryDeltas['Mike']['Salary']).to.equal(510000)
  })

  it('gives team average delta if no history is available', function () {
    stats = {
      'Mike': {'Team': 'Beans'},
      'Jim': {'Team': 'Beans', 'Goals': 1},
      'Meg': {'Team': 'Beans', 'D-Blocks': 1}
    }

    // 1 playValues[Goal] * 1 playValues[D-Block]
    let expectedDelta = (10000 + 8000) / 2

    // defaultSalary + expectedDelta
    let expectedSalary = 500000 + expectedDelta

    let salaryDeltas = calcSalaries(stats, [])
    expect(salaryDeltas['Mike']['SalaryDelta']).to.equal(expectedDelta)
    expect(salaryDeltas['Mike']['Salary']).to.equal(expectedSalary)
  })

  it('regular salary gain for new player in week 4', function () {
    games[0].week = 4
    stats = { 'Newbie': {'Team': 'Beans', 'Goals': 1} }

    let salaryDeltas = calcSalaries(stats, games)
    let expectedDelta = 10000
    // the delta multplied by the number of weeks into the league
    let expectedSalary = expectedDelta * 4 + 500000

    expect(salaryDeltas['Newbie']['SalaryDelta']).to.equal(expectedDelta)
    expect(salaryDeltas['Newbie']['Salary']).to.equal(expectedSalary)
  })

  it('negative salary gain for new player in week 8', function () {
    games[0].week = 8
    stats = { 'Newbie': {'Team': 'Beans',
      'Catches': 2,
      'Completions': 1,
      'Throwaways': 1,
      'Drops': 2
    }}

    let salaryDeltas = calcSalaries(stats, games)
    let expectedDelta = -12000
    let expectedSalary = expectedDelta * 8 + 500000

    expect(salaryDeltas['Newbie']['SalaryDelta']).to.equal(expectedDelta)
    expect(salaryDeltas['Newbie']['Salary']).to.equal(expectedSalary)
  })
})
