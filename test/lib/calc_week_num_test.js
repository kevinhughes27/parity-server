import chai from 'chai'
let expect = chai.expect

import calcWeekNum from '../../lib/calc_week_num'

describe('calcWeekNum', function () {
  it('returns week 1 for a date less than week 2', function () {
    let date = new Date('2016-11-07')
    let week = calcWeekNum(date)
    expect(week).to.equal(1)
  })

  it('returns week 2 for a date less than week 3 but greater than week 2', function () {
    let date = new Date('2016-11-19')
    let week = calcWeekNum(date)
    expect(week).to.equal(2)
  })
})
