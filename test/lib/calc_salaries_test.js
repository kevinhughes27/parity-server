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

  it('sets default for initial salary', function () {
    let stats = {
      'Mike': {
        'Drops': 1
      }
    }
    let salaryDeltas = calcSalaries(stats)
    expect(salaryDeltas['Mike']['Salary']).to.equal(495000)
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
