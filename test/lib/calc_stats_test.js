import chai from 'chai'
let expect = chai.expect

import calcStats from '../../lib/calc_stats'

describe('calcStats', function () {
  it('stat: Pulls', function () {
    let input = ['Pull,Jill', 'Direction,>>>>>>']
    let output = calcStats(input)
    expect(output['Jill']['Pulls']).to.equal(1)
  })

  it('stat: Pick-Ups', function () {
    let input = ['Direction,>>>>>>,POINT,Jill,Pass,Bob']
    let output = calcStats(input)
    expect(output['Bob']['Pick-Ups']).to.equal(1)
  })

  it('stat: Goals', function () {
    let input = ['Direction,>>>>>>,POINT,Jill']
    let output = calcStats(input)
    expect(output['Jill']['Goals']).to.equal(1)
  })

  it('stat: Assists', function () {
    let input = ['Direction,>>>>>>,POINT,Jill,Pass,Bob']
    let output = calcStats(input)
    expect(output['Bob']['Assists']).to.equal(1)
  })

  it('stat: 2nd Assists', function () {
    let input = ['Direction,>>>>>>,POINT,Jill,Pass,Bob,Pass,Jim']
    let output = calcStats(input)
    expect(output['Jim']['2nd Assist']).to.equal(1)
  })

  it('stat: 3rd Assists', function () {
    let input = ['Direction,>>>>>>,POINT,Jill,Pass,Bob,Pass,Jim,Pass,Bob']
    let output = calcStats(input)
    expect(output['Bob']['3rd Assist']).to.equal(1)
  })

  it('stat: 4th Assists', function () {
    let input = ['Direction,>>>>>>,POINT,Jill,Pass,Bob,Pass,Jim,Pass,Bob,Pass,Jim']
    let output = calcStats(input)
    expect(output['Jim']['4th Assist']).to.equal(1)
  })

  it('stat: 5th Assists', function () {
    let input = ['Direction,>>>>>>,POINT,Jill,Pass,Bob,Pass,Jim,Pass,Bob,Pass,Jim,Pass,Bob']
    let output = calcStats(input)
    expect(output['Bob']['5th Assist']).to.equal(1)
  })

  it('stat: D-Blocks', function () {
    let input = ['D,Jill']
    let output = calcStats(input)
    expect(output['Jill']['D-Blocks']).to.equal(1)
  })

  it('stat: Completions 1', function () {
    let input = ['Direction,>>>>>>,POINT,Jill,Pass,Bob']
    let output = calcStats(input)
    expect(output['Bob']['Completions']).to.equal(1)
  })

  it('stat: Completions 2', function () {
    let input = ['Direction,>>>>>>,POINT,Jill,Pass,Bob,Pass,Jim,Pass,Bob,Pass,Jim']
    let output = calcStats(input)
    expect(output['Bob']['Completions']).to.equal(2)
  })

  it('stat: Completions (jagged array)', function () {
    let input = [
      'Direction,>>>>>>,POINT,Jill,Pass,Bob',
      'Direction,>>>>>>,POINT,Jill,Pass,Bob,Pass,Jim,Pass,Bob,Pass,Jim'
    ]

    let output = calcStats(input)
    expect(output['Bob']['Completions']).to.equal(3)
  })

  it('stat: Catches 1', function () {
    let input = ['Direction,>>>>>>,POINT,Jill,Pass,Bob']
    let output = calcStats(input)
    expect(output['Jill']['Catches']).to.equal(1)
  })

  it('stat: Catches 2', function () {
    let input = ['Direction,>>>>>>,POINT,Jill,Pass,Bob,Pass,Jill,Pass,Bob']
    let output = calcStats(input)
    expect(output['Jill']['Catches']).to.equal(2)
  })

  it('stat: Throwaways', function () {
    let input = ['Direction,>>>>>>,Throw Away,Jill,Pass,Bob']
    let output = calcStats(input)
    expect(output['Jill']['Throwaways']).to.equal(1)
  })

  it('stat: ThrewDrop & Drop', function () {
    let input = ['Direction,>>>>>>,Drop,Jill,Pass,Bob']
    let output = calcStats(input)
    expect(output['Bob']['ThrewDrop']).to.equal(1)
    expect(output['Jill']['Drops']).to.equal(1)
  })

  it('stat: Callahan', function () {
    let input = ['Direction,>>>>>>,POINT,Jill']
    let output = calcStats(input)
    expect(output['Jill']['Goals']).to.equal(1)
    expect(output['Jill']['Calihan']).to.equal(1)
  })

  it('stat: OPointsFor', function () {
    let input = [
      'Direction,<<<<<<,POINT,Jill',
      '1,Jill',
      '-1,Jane'
    ]

    let output = calcStats(input)
    expect(output['Jill']['OPointsFor']).to.equal(1)
  })

  it('stat: DPointsAgainst', function () {
    let input = [
      'Direction,<<<<<<,POINT,Jill',
      '1,Jill',
      '-1,Jane'
    ]

    let output = calcStats(input)
    expect(output['Jane']['DPointsAgainst']).to.equal(1)
  })

  it('stat: OPointsAgainst', function () {
    let input = [
      'Direction,<<<<<<,Drop,Jill,Pass,Bob',
      'Direction,>>>>>>,POINT,Mike,Pass,Jane',
      '-1,Jill',
      '-1,Bob',
      '1,Mike',
      '1,Jane'
    ]

    let output = calcStats(input)
    expect(output['Bob']['OPointsAgainst']).to.equal(1)
    expect(output['Jill']['OPointsAgainst']).to.equal(1)
  })

  it('stat: DPointsFor', function () {
    let input = [
      'Direction,<<<<<<,Drop,Jill,Pass,Bob',
      'Direction,>>>>>>,POINT,Mike,Pass,Jane',
      '-1,Jill',
      '-1,Bob',
      '1,Mike',
      '1,Jane'
    ]

    let output = calcStats(input)
    expect(output['Jane']['DPointsFor']).to.equal(1)
    expect(output['Mike']['DPointsFor']).to.equal(1)
  })

  it('test game A', function () {
    let input = [
      'Pull,Mike',
      'Direction,<<<<<<,Drop,Jill,Pass,Bob',
      'Direction,>>>>>>,POINT,Mike,Pass,Jane',
      '-1,Jill',
      '-1,Bob',
      '1,Mike',
      '1,Jane',
      'Direction,<<<<<<,POINT,Jill,Pass,Bob,Jill',
      '1,Jill',
      '1,Bob',
      '-1,Mike',
      '-1,Jane',
      'Direction,>>>>>>,Throw Away,Jane'
    ]

    let output = calcStats(input)

    expect(output['Jane']['DPointsFor']).to.equal(1)
    expect(output['Mike']['DPointsFor']).to.equal(1)
    expect(output['Jane']['DPointsAgainst']).to.equal(1)
    expect(output['Mike']['DPointsAgainst']).to.equal(1)

    expect(output['Bob']['OPointsAgainst']).to.equal(1)
    expect(output['Jill']['OPointsAgainst']).to.equal(1)
    expect(output['Bob']['OPointsFor']).to.equal(1)
    expect(output['Jill']['OPointsFor']).to.equal(1)

    expect(output['Mike']['Goals']).to.equal(1)
    expect(output['Jill']['Goals']).to.equal(1)

    expect(output['Jane']['Assists']).to.equal(1)
    expect(output['Bob']['Assists']).to.equal(1)

    expect(output['Jane']['Throwaways']).to.equal(1)
    expect(output['Mike']['Pulls']).to.equal(1)
    expect(output['Jill']['Drops']).to.equal(1)
  })

  it('extra spaces are ignored', function () {
    let input = ['    Direction,>>>>>>,POINT,Jill']
    let output = calcStats(input)
    expect(output['Jill']['Goals']).to.equal(1)
  })
})
