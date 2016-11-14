import chai from 'chai'
let expect = chai.expect

import calcStats from '../../lib/calc_stats_new'

describe('calcStats', function () {
  it('stat: Pulls', function () {
    let input = [{
      'events': [
        {
          'type': 'PULL',
          'timestamp': 'Mar 13, 2017 7:09:17 PM',
          'firstActor': 'Jill'
        },
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:10:30 PM',
          'secondActor': 'Jane',
          'firstActor': 'Mike'
        }
      ]
    }]
    let output = calcStats(input)
    expect(output['Jill']['Pulls']).to.equal(1)
  })

  it('stat: Pick-Ups', function () {
    let input = [{
      'events': [
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:10:30 PM',
          'secondActor': 'Jill',
          'firstActor': 'Bob'
        },
        {
          'type': 'POINT',
          'timestamp': 'Mar 13, 2017 7:10:34 PM',
          'firstActor': 'Jill'
        }
      ]
    }]
    let output = calcStats(input)
    expect(output['Bob']['Pick-Ups']).to.equal(1)
  })

  it('stat: Goals', function () {
    let input = [{
      'events': [
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:10:30 PM',
          'secondActor': 'Jill',
          'firstActor': 'Bob'
        },
        {
          'type': 'POINT',
          'timestamp': 'Mar 13, 2017 7:10:34 PM',
          'firstActor': 'Jill'
        }
      ]
    }]
    let output = calcStats(input)
    expect(output['Jill']['Goals']).to.equal(1)
  })

  it('stat: Assists', function () {
    let input = [{
      'events': [
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:10:30 PM',
          'secondActor': 'Jill',
          'firstActor': 'Bob'
        },
        {
          'type': 'POINT',
          'timestamp': 'Mar 13, 2017 7:10:34 PM',
          'firstActor': 'Jill'
        }
      ]
    }]
    let output = calcStats(input)
    expect(output['Bob']['Assists']).to.equal(1)
  })

  it('stat: 2nd Assists', function () {
    let input = [{
      'events': [
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:10:25 PM',
          'secondActor': 'Bob',
          'firstActor': 'Jim'
        },
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:10:30 PM',
          'secondActor': 'Jill',
          'firstActor': 'Bob'
        },
        {
          'type': 'POINT',
          'timestamp': 'Mar 13, 2017 7:10:34 PM',
          'firstActor': 'Jill'
        }
      ]
    }]
    let output = calcStats(input)
    expect(output['Jim']['2nd Assist']).to.equal(1)
  })

  it('stat: D-Blocks', function () {
    let input = [{
      'events': [
        {
          'type': 'DEFENSE',
          'timestamp': 'Mar 13, 2017 7:13:25 PM',
          'firstActor': 'Jill'
        }
      ]
    }]
    let output = calcStats(input)
    expect(output['Jill']['D-Blocks']).to.equal(1)
  })

  it('stat: Completions 1', function () {
    let input = [{
      'events': [
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:10:30 PM',
          'secondActor': 'Jill',
          'firstActor': 'Bob'
        },
        {
          'type': 'POINT',
          'timestamp': 'Mar 13, 2017 7:10:34 PM',
          'firstActor': 'Jill'
        }
      ]
    }]
    let output = calcStats(input)
    expect(output['Bob']['Completions']).to.equal(1)
  })

  it('stat: Completions 2', function () {
    let input = [{
      'events': [
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:10:15 PM',
          'secondActor': 'Bob',
          'firstActor': 'Jim'
        },
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:10:20 PM',
          'secondActor': 'Jim',
          'firstActor': 'Bob'
        },
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:10:25 PM',
          'secondActor': 'Bob',
          'firstActor': 'Jim'
        },
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:10:30 PM',
          'secondActor': 'Jill',
          'firstActor': 'Bob'
        },
        {
          'type': 'POINT',
          'timestamp': 'Mar 13, 2017 7:10:34 PM',
          'firstActor': 'Jill'
        }
      ]
    }]
    let output = calcStats(input)
    expect(output['Bob']['Completions']).to.equal(2)
  })

  it('stat: Catches 1', function () {
    let input = [{
      'events': [
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:10:30 PM',
          'secondActor': 'Jill',
          'firstActor': 'Bob'
        },
        {
          'type': 'POINT',
          'timestamp': 'Mar 13, 2017 7:10:34 PM',
          'firstActor': 'Jill'
        }
      ]
    }]
    let output = calcStats(input)
    expect(output['Jill']['Catches']).to.equal(1)
  })

  it('stat: Catches 2', function () {
    let input = [{
      'events': [
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:10:15 PM',
          'secondActor': 'Jill',
          'firstActor': 'Bob'
        },
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:10:20 PM',
          'secondActor': 'Bob',
          'firstActor': 'Jill'
        },
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:10:30 PM',
          'secondActor': 'Jill',
          'firstActor': 'Bob'
        },
        {
          'type': 'POINT',
          'timestamp': 'Mar 13, 2017 7:10:34 PM',
          'firstActor': 'Jill'
        }
      ]
    }]
    let output = calcStats(input)
    expect(output['Jill']['Catches']).to.equal(2)
  })

  it('stat: Throwaways', function () {
    let input = [{
      'events': [
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:13:38 PM',
          'secondActor': 'Jill',
          'firstActor': 'Bob'
        },
        {
          'type': 'THROWAWAY',
          'timestamp': 'Mar 13, 2017 7:13:38 PM',
          'firstActor': 'Jill'
        }
      ]
    }]
    let output = calcStats(input)
    expect(output['Jill']['Throwaways']).to.equal(1)
  })

  it('stat: ThrewDrop & Drop', function () {
    let input = [{
      'events': [
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:13:38 PM',
          'secondActor': 'Jill',
          'firstActor': 'Bob'
        },
        {
          'type': 'DROP',
          'timestamp': 'Mar 13, 2017 7:13:38 PM',
          'firstActor': 'Jill'
        }
      ]
    }]
    let output = calcStats(input)
    expect(output['Bob']['ThrewDrop']).to.equal(1)
    expect(output['Jill']['Drops']).to.equal(1)
  })

  it('stat: Callahan', function () {
    let input = [{
      'events': [
        {
          'type': 'POINT',
          'timestamp': 'Mar 13, 2017 7:10:34 PM',
          'firstActor': 'Jill'
        }
      ]
    }]
    let output = calcStats(input)
    expect(output['Jill']['Goals']).to.equal(1)
    expect(output['Jill']['Calihan']).to.equal(1)
  })

  it('stat: OPointsFor', function () {
    let input = [{
      'offensePlayers': [
        'Jill',
        'Bob'
      ],
      'defensePlayers': [
        'Mike',
        'Jane'
      ],
      'events': [
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:13:38 PM',
          'secondActor': 'Jill',
          'firstActor': 'Bob'
        },
        {
          'type': 'POINT',
          'timestamp': 'Mar 13, 2017 7:13:38 PM',
          'firstActor': 'Jill'
        }
      ]
    }]

    let output = calcStats(input)
    expect(output['Jill']['OPointsFor']).to.equal(1)
  })

  it('stat: DPointsAgainst', function () {
    let input = [{
      'offensePlayers': [
        'Jill',
        'Bob'
      ],
      'defensePlayers': [
        'Mike',
        'Jane'
      ],
      'events': [
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:13:38 PM',
          'secondActor': 'Jill',
          'firstActor': 'Bob'
        },
        {
          'type': 'POINT',
          'timestamp': 'Mar 13, 2017 7:13:38 PM',
          'firstActor': 'Jill'
        }
      ]
    }]

    let output = calcStats(input)
    expect(output['Jane']['DPointsAgainst']).to.equal(1)
  })

  it('stat: OPointsAgainst (direction left)', function () {
    let input = [{
      'offensePlayers': [
        'Jill',
        'Bob'
      ],
      'defensePlayers': [
        'Mike',
        'Jane'
      ],
      'events': [
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:13:38 PM',
          'secondActor': 'Jill',
          'firstActor': 'Bob'
        },
        {
          'type': 'DROP',
          'timestamp': 'Mar 13, 2017 7:13:38 PM',
          'firstActor': 'Jill'
        },
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:13:38 PM',
          'secondActor': 'Jane',
          'firstActor': 'Mike'
        },
        {
          'type': 'POINT',
          'timestamp': 'Mar 13, 2017 7:13:38 PM',
          'firstActor': 'Jane'
        }
      ]
    }]

    let output = calcStats(input)
    expect(output['Bob']['OPointsAgainst']).to.equal(1)
    expect(output['Jill']['OPointsAgainst']).to.equal(1)
  })

  it('stat: DPointsFor (direction left)', function () {
    let input = [{
      'offensePlayers': [
        'Jill',
        'Bob'
      ],
      'defensePlayers': [
        'Mike',
        'Jane'
      ],
      'events': [
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:13:38 PM',
          'secondActor': 'Jill',
          'firstActor': 'Bob'
        },
        {
          'type': 'DROP',
          'timestamp': 'Mar 13, 2017 7:13:38 PM',
          'firstActor': 'Jill'
        },
        {
          'type': 'PASS',
          'timestamp': 'Mar 13, 2017 7:13:38 PM',
          'secondActor': 'Jane',
          'firstActor': 'Mike'
        },
        {
          'type': 'POINT',
          'timestamp': 'Mar 13, 2017 7:13:38 PM',
          'firstActor': 'Jane'
        }
      ]
    }]

    let output = calcStats(input)
    expect(output['Jane']['DPointsFor']).to.equal(1)
    expect(output['Mike']['DPointsFor']).to.equal(1)
  })

  it('test game A', function () {
    let input = [
      {
        'offensePlayers': [
          'Jill',
          'Bob'
        ],
        'defensePlayers': [
          'Mike',
          'Jane'
        ],
        'events': [
          {
            'type': 'PULL',
            'timestamp': 'Mar 13, 2017 7:09:17 PM',
            'firstActor': 'Mike'
          },
          {
            'type': 'PASS',
            'timestamp': 'Mar 13, 2017 7:13:38 PM',
            'secondActor': 'Jill',
            'firstActor': 'Bob'
          },
          {
            'type': 'DROP',
            'timestamp': 'Mar 13, 2017 7:13:38 PM',
            'firstActor': 'Jill'
          },
          {
            'type': 'PASS',
            'timestamp': 'Mar 13, 2017 7:13:38 PM',
            'secondActor': 'Mike',
            'firstActor': 'Jane'
          },
          {
            'type': 'POINT',
            'timestamp': 'Mar 13, 2017 7:13:38 PM',
            'firstActor': 'Mike'
          }
        ]
      },
      {
        'offensePlayers': [
          'Jill',
          'Bob'
        ],
        'defensePlayers': [
          'Mike',
          'Jane'
        ],
        'events': [
          {
            'type': 'PASS',
            'timestamp': 'Mar 13, 2017 7:13:38 PM',
            'secondActor': 'Jill',
            'firstActor': 'Bob'
          },
          {
            'type': 'POINT',
            'timestamp': 'Mar 13, 2017 7:13:38 PM',
            'firstActor': 'Jill'
          }
        ]
      },
      {
        'offensePlayers': [
          'Mike',
          'Jane'
        ],
        'defensePlayers': [
          'Jill',
          'Bob'
        ],
        'events': [
          {
            'type': 'THROWAWAY',
            'timestamp': 'Mar 13, 2017 7:13:40 PM',
            'firstActor': 'Jane'
          }
        ]
      }
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
})
