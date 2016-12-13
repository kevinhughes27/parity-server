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

  it('gives a player their average salary delta if they are absent', function () {
    stats['Mike'] = {'Team': 'Beans'}
    let salaryDeltas = calcSalaries(stats, games)
    expect(salaryDeltas['Mike']['SalaryDelta']).to.equal(10000)
    expect(salaryDeltas['Mike']['Salary']).to.equal(510000)
  })

  it('averageDelta is 0 for player who has no past games', function () {
    stats['Mike'] = {'Team': 'Beans'}
    let salaryDeltas = calcSalaries(stats, [])
    expect(salaryDeltas['Mike']['SalaryDelta']).to.equal(0)
    expect(salaryDeltas['Mike']['Salary']).to.equal(500000)
  })

  it('adds delta to previous salary', function () {
    stats['Mike'] = { 'Drops': 1 }
    let salaryDeltas = calcSalaries(stats, games)
    expect(salaryDeltas['Mike']['Salary']).to.equal(495000)
  })
})
