import chai from 'chai'
let expect = chai.expect

chai.use(require('sinon-chai'))

import calcSalaries from '../../lib/calc_salaries'

describe('calcSalaries', function () {
  it('increase for goals', function () {
    let stats = {
      'Mike': {
        'Goals': 1
      }
    }
    let salaryDeltas = calcSalaries(stats)
    expect(salaryDeltas['Mike']['SalaryDelta']).to.equal(10000)
  })

  it('decrease for drops', function () {
    let stats = {
      'Mike': {
        'Drops': 1
      }
    }
    let salaryDeltas = calcSalaries(stats)
    expect(salaryDeltas['Mike']['SalaryDelta']).to.equal(-5000)
  })

  it('gives the default for initial salary', function () {
    let stats = {
      'Mike': {
        'Drops': 1
      }
    }
    let salaryDeltas = calcSalaries(stats)
    expect(salaryDeltas['Mike']['Salary']).to.equal(495000)
  })

  it('gives previous weeks average salaray + gains to a new player in week 2 or higher', function () {
    let stats = {
      'Mike': {'Team': 'Beans', 'Goals': 2},
      'Jill': {'Team': 'Beans', 'Goals': 1}
    }

    let prevWeek = {
      week: 2,
      stats: {'Jill': {'Salary': 100000, 'SalaryDelta': 5000}}
    }

    let salaryDeltas = calcSalaries(stats, prevWeek)
    expect(salaryDeltas['Mike']['SalaryDelta']).to.equal(20000)
    expect(salaryDeltas['Mike']['Salary']).to.equal(120000)
  })

  it('gives previous weeks average salaray to a new absent player in week 2 or higher', function () {
    let stats = {
      'Mike': {'Team': 'Beans'},
      'Jill': {'Team': 'Beans', 'Goals': 1}
    }

    let prevWeek = {
      week: 2,
      stats: {'Jill': {'Salary': 100000, 'SalaryDelta': 5000}}
    }

    let salaryDeltas = calcSalaries(stats, prevWeek)
    expect(salaryDeltas['Mike']['SalaryDelta']).to.equal(10000)
    expect(salaryDeltas['Mike']['Salary']).to.equal(110000)
  })

  it('gives the average salaray delta to a player who misses week 1', function () {
    let stats = {
      'Mike': {'Team': 'Beans'},
      'Jim': {'Team': 'Beans', 'Goals': 1},
      'Meg': {'Team': 'Beans', 'D-Blocks': 1}
    }

    // 1 playValues[Goal] * 1 playValues[D-Block]
    let expectedDelta = (10000 + 8000) / 2

    // defaultSalary + expectedDelta
    let expectedSalary = 500000 + expectedDelta

    let salaryDeltas = calcSalaries(stats)
    expect(salaryDeltas['Mike']['SalaryDelta']).to.equal(expectedDelta)
    expect(salaryDeltas['Mike']['Salary']).to.equal(expectedSalary)
  })

  it('gives salaray delta from the previous week if player is absent', function () {
    let stats = {
      'Mike': {'Team': 'Beans'}
    }

    let prevWeek = {
      week: 1,
      stats: {
        'Mike': {'Team': 'Beans', 'Goals': 1, 'SalaryDelta': 10000, 'Salary': 500000}
      }
    }

    let salaryDeltas = calcSalaries(stats, prevWeek)
    expect(salaryDeltas['Mike']['SalaryDelta']).to.equal(10000)
    expect(salaryDeltas['Mike']['Salary']).to.equal(510000)
  })

  it('adds to previous salary', function () {
    let stats = {
      'Mike': {
        'Drops': 1
      }
    }

    let prevWeek = {
      stats: {
        'Mike': {
          'Salary': 1000000
        }
      }
    }

    let salaryDeltas = calcSalaries(stats, prevWeek)
    expect(salaryDeltas['Mike']['Salary']).to.equal(995000)
  })
})
