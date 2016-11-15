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
    let input = ['POINT,Jill,Pass,Bob']
    let output = calcStats(input)
    expect(output['Bob']['Pick-Ups']).to.equal(1)
  })

  it('stat: Goals', function () {
    let input = ['POINT,Jill']
    let output = calcStats(input)
    expect(output['Jill']['Goals']).to.equal(1)
  })

  it('stat: Assists', function () {
    let input = ['POINT,Jill,Pass,Bob']
    let output = calcStats(input)
    expect(output['Bob']['Assists']).to.equal(1)
  })

  it('stat: 2nd Assists', function () {
    let input = ['POINT,Jill,Pass,Bob,Pass,Jim']
    let output = calcStats(input)
    expect(output['Jim']['2nd Assist']).to.equal(1)
  })

  // it('stat: 3rd Assists', function () {
  //   let input = ['POINT,Jill,Pass,Bob,Pass,Jim,Pass,Bob']
  //   let output = calcStats(input)
  //   expect(output['Bob']['3rd Assist']).to.equal(1)
  // })
  //
  // it('stat: 4th Assists', function () {
  //   let input = ['POINT,Jill,Pass,Bob,Pass,Jim,Pass,Bob,Pass,Jim']
  //   let output = calcStats(input)
  //   expect(output['Jim']['4th Assist']).to.equal(1)
  // })
  //
  // it('stat: 5th Assists', function () {
  //   let input = ['POINT,Jill,Pass,Bob,Pass,Jim,Pass,Bob,Pass,Jim,Pass,Bob']
  //   let output = calcStats(input)
  //   expect(output['Bob']['5th Assist']).to.equal(1)
  // })

  it('stat: D-Blocks', function () {
    let input = ['D,Jill']
    let output = calcStats(input)
    expect(output['Jill']['D-Blocks']).to.equal(1)
  })

  it('stat: Completions 1', function () {
    let input = ['POINT,Jill,Pass,Bob']
    let output = calcStats(input)
    expect(output['Bob']['Completions']).to.equal(1)
  })

  it('stat: Completions 2', function () {
    let input = ['POINT,Jill,Pass,Bob,Pass,Jim,Pass,Bob,Pass,Jim']
    let output = calcStats(input)
    expect(output['Bob']['Completions']).to.equal(2)
  })

  it('stat: Completions (jagged array)', function () {
    let input = [
      'POINT,Jill,Pass,Bob',
      'POINT,Jill,Pass,Bob,Pass,Jim,Pass,Bob,Pass,Jim'
    ]

    let output = calcStats(input)
    expect(output['Bob']['Completions']).to.equal(3)
  })

  it('stat: Catches 1', function () {
    let input = ['POINT,Jill,Pass,Bob']
    let output = calcStats(input)
    expect(output['Jill']['Catches']).to.equal(1)
  })

  it('stat: Catches 2', function () {
    let input = ['POINT,Jill,Pass,Bob,Pass,Jill,Pass,Bob']
    let output = calcStats(input)
    expect(output['Jill']['Catches']).to.equal(2)
  })

  it('stat: Throwaways', function () {
    let input = ['Throw Away,Jill,Pass,Bob']
    let output = calcStats(input)
    expect(output['Jill']['Throwaways']).to.equal(1)
  })

  it('stat: ThrewDrop & Drop', function () {
    let input = ['Drop,Jill,Pass,Bob']
    let output = calcStats(input)
    expect(output['Bob']['ThrewDrop']).to.equal(1)
    expect(output['Jill']['Drops']).to.equal(1)
  })

  it('stat: Callahan', function () {
    let input = ['POINT,Jill']
    let output = calcStats(input)
    expect(output['Jill']['Goals']).to.equal(1)
    expect(output['Jill']['Calihan']).to.equal(1)
  })

  it('stat: OPointsFor (direction left)', function () {
    let input = [
      'Pull,Mike',
      'Direction,>>>>>>',
      'POINT,Jill,Pass,Bob',
      '+1,Jill',
      '+1,Bob',
      '-1,Mike',
      '-1,Jane'
    ]

    let output = calcStats(input)
    expect(output['Jill']['OPointsFor']).to.equal(1)
  })

  it('stat: OPointsFor (direction not left)', function () {
    let input = [
      'Pull,Jill',
      'Direction,<<<<<<',
      'POINT,Jane,Pass,Mike',
      '-1,Jill',
      '-1,Bob',
      '+1,Mike',
      '+1,Jane'
    ]

    let output = calcStats(input)
    expect(output['Jane']['OPointsFor']).to.equal(1)
  })

  it('stat: DPointsAgainst (direction left)', function () {
    let input = [
      'Pull,Mike',
      'Direction,>>>>>>',
      'POINT,Jill,Pass,Bob',
      '+1,Jill',
      '+1,Bob',
      '-1,Mike',
      '-1,Jane'
    ]

    let output = calcStats(input)
    expect(output['Jane']['DPointsAgainst']).to.equal(1)
  })

  it('stat: DPointsAgainst (direction not left)', function () {
    let input = [
      'Pull,Jill',
      'Direction,<<<<<<',
      'POINT,Jane,Pass,Mike',
      '-1,Jill',
      '-1,Bob',
      '+1,Mike',
      '+1,Jane'
    ]

    let output = calcStats(input)
    expect(output['Jill']['DPointsAgainst']).to.equal(1)
  })

  it('stat: OPointsAgainst (direction left)', function () {
    let input = [
      'Pull,Mike',
      'Direction,>>>>>>',
      'Drop,Jill,Pass,Bob',
      'Direction,<<<<<<',
      'POINT,Mike,Pass,Jane',
      '-1,Jill',
      '-1,Bob',
      '+1,Mike',
      '+1,Jane'
    ]

    let output = calcStats(input)
    expect(output['Bob']['OPointsAgainst']).to.equal(1)
    expect(output['Jill']['OPointsAgainst']).to.equal(1)
  })

  it('stat: OPointsAgainst (direction not left)', function () {
    let input = [
      'Pull,Jill',
      'Direction,<<<<<<',
      'Drop,Mike,Pass,Jane',
      'Direction,>>>>>>',
      'POINT,Jill,Pass,Bob',
      '+1,Jill',
      '+1,Bob',
      '-1,Mike',
      '-1,Jane'
    ]

    let output = calcStats(input)
    expect(output['Mike']['OPointsAgainst']).to.equal(1)
    expect(output['Jane']['OPointsAgainst']).to.equal(1)
  })

  it('stat: DPointsFor (direction left)', function () {
    let input = [
      'Pull,Mike',
      'Direction,>>>>>>',
      'Drop,Jill,Pass,Bob',
      'Direction,<<<<<<',
      'POINT,Mike,Pass,Jane',
      '-1,Jill',
      '-1,Bob',
      '+1,Mike',
      '+1,Jane'
    ]

    let output = calcStats(input)
    expect(output['Jane']['DPointsFor']).to.equal(1)
    expect(output['Mike']['DPointsFor']).to.equal(1)
  })

  it('stat: DPointsFor (direction not left)', function () {
    let input = [
      'Pull,Jill',
      'Direction,<<<<<<',
      'Drop,Mike,Pass,Jane',
      'Direction,>>>>>>',
      'POINT,Jill,Pass,Bob',
      '+1,Jill',
      '+1,Bob',
      '-1,Mike',
      '-1,Jane'
    ]

    let output = calcStats(input)
    expect(output['Jill']['DPointsFor']).to.equal(1)
    expect(output['Bob']['DPointsFor']).to.equal(1)
  })

  it('test game A', function () {
    let input = [
      'Pull,Mike',
      'Direction,>>>>>>',
      'Drop,Jill,Pass,Bob',
      'Direction,<<<<<<',
      'POINT,Mike,Pass,Jane',
      '-1,Jill',
      '-1,Bob',
      '+1,Mike',
      '+1,Jane',
      'Direction,>>>>>>',
      'POINT,Jill,Pass,Bob',
      '+1,Jill',
      '+1,Bob',
      '-1,Mike',
      '-1,Jane',
      'Direction,<<<<<<',
      'Throw Away,Jane'
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
    let input = ['    POINT,Jill']
    let output = calcStats(input)
    expect(output['Jill']['Goals']).to.equal(1)
  })
})
