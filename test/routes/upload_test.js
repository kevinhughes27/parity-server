import _ from 'lodash'
import chai from 'chai'
let expect = chai.expect

chai.use(require('sinon-chai'))
import request from 'request-promise'

process.env.TEST = 1
process.env.PORT = 3002
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
const Db = require('monk')(process.env.MONGODB_URI)
const Games = Db.get('games')

describe('POST /upload', function () {
  var server = require('../../server')
  var baseUrl = 'http://localhost:3002'
  var url = `${baseUrl}/upload`

  var game1 = {
    week: 1,
    teams: {
      'Team1': [
        'Jill',
        'Bob',
        'Absent Player'
      ],
      'Team2': [
        'Mike',
        'Jane',
        'Dan'
      ]
    },
    events: [
      'Pull\tMike',
      'Direction\t>>>>>>',
      'Direction\t<<<<<<\tDrop\tJill\tPass\tBob',
      'Direction\t>>>>>>\tPOINT\tMike\tPass\tJane',
      'O-\tJill\tD+\tMike',
      'O-\tBob\tD+\tJane'
    ]
  }

  var game2 = {
    week: 1,
    teams: {
      'Team3': [
        'Meg',
        'Bill'
      ],
      'Team4': [
        'Joe'
      ]
    },
    events: [
      'Pull\tJoe',
      'Direction\t>>>>>>',
      'Direction\t<<<<<<\tDrop\tMeg\tPass\tBill',
      'Direction\t>>>>>>\tPOINT\tJoe\tPass\tJulie',
      'O-\tMeg\tD+\tJoe',
      'O-\tBill\tD+\tJulie'
    ]
  }

  before(function () {
    server.listen(3002)
  })

  afterEach(function () {
    Games.drop()
  })

  after(function () {
    server.close()
  })

  it('returns status code 201', async function () {
    let response = await request.post({
      url: url,
      body: game1,
      json: true,
      resolveWithFullResponse: true
    })

    expect(response.statusCode).to.equal(201)
  })

  it('calculates the stats', async function () {
    let game = await request.post({url: url, json: true, body: game1})
    let stats = game.stats

    expect(stats['Mike']['Pulls']).to.equal(1)
    expect(stats['Mike']['Goals']).to.equal(1)
    expect(stats['Jill']['Drops']).to.equal(1)
  })

  it('calculates salary change', async function () {
    let game = await request.post({url: url, json: true, body: game1})
    let stats = game.stats

    expect(stats['Mike']['SalaryDelta']).to.equal(11000)
    expect(stats['Jill']['SalaryDelta']).to.equal(-5000)
  })

  it('adds the team to the stats', async function () {
    let game = await request.post({url: url, json: true, body: game1})
    let stats = game.stats

    expect(stats['Mike']['Team']).to.equal('Team2')
    expect(stats['Jill']['Team']).to.equal('Team1')
  })

  it('players not on the roster are given Substitute as their team', async function () {
    let game = await request.post({url: url, json: true, body: game2})
    let stats = game.stats

    expect(stats['Joe']['Team']).to.equal('Team4')
    expect(stats['Julie']['Team']).to.equal('Substitute')
  })

  it('saves the game to mongodb', async function () {
    await request.post({url: url, json: true, body: game1})

    let game = await Games.findOne()
    let stats = game.stats

    expect(_.keys(stats).length).to.equal(6)
    expect(stats['Mike']['Pulls']).to.equal(1)
    expect(stats['Mike']['Goals']).to.equal(1)
    expect(stats['Jill']['Drops']).to.equal(1)
  })

  it('salary adds week to week', async function () {
    await request.post({url: url, json: true, body: game1})
    let game = _.assign({}, game1, {week: 2})
    await request.post({url: url, json: true, body: game})

    let w1 = await request.get(`${baseUrl}/weeks/1`, { json: true })
    let w2 = await request.get(`${baseUrl}/weeks/2`, { json: true })

    expect(w1['stats']['Mike']['Salary']).to.equal(511000)
    expect(w2['stats']['Mike']['Salary']).to.equal(522000)
  })

  it('salary adds week to week for Absent Player', async function () {
    await request.post({url: url, json: true, body: game1})
    let game = _.assign({}, game1, {week: 2})
    await request.post({url: url, json: true, body: game})

    let w1 = await request.get(`${baseUrl}/weeks/1`, { json: true })
    let w2 = await request.get(`${baseUrl}/weeks/2`, { json: true })

    expect(w1['stats']['Absent Player']['Salary']).to.equal(503625)
    expect(w2['stats']['Absent Player']['Salary']).to.equal(507250)
  })

  // Note that it is a requirement the players are in the roster
  // even if they don't play.
  it('plays week 1, misses week 2, plays week 3', async function () {
    await request.post({url: url, json: true, body: game1})

    // Make Mike miss the game by being not present in any field events
    let game = _.assign({}, game1, {
      week: 2,
      events: [
        'Pull\tDan',
        'Direction\t>>>>>>',
        'Direction\t<<<<<<\tDrop\tJill\tPass\tBob',
        'Direction\t>>>>>>\tPOINT\tDan\tPass\tJane',
        'O-\tJill\tD+\tDan',
        'O-\tBob\tD+\tJane'
      ]
    })
    await request.post({url: url, json: true, body: game})

    game = _.assign({}, game1, {week: 3})
    await request.post({url: url, json: true, body: game})

    let w1 = await request.get(`${baseUrl}/weeks/1`, { json: true })
    let w2 = await request.get(`${baseUrl}/weeks/2`, { json: true })
    let w3 = await request.get(`${baseUrl}/weeks/3`, { json: true })

    expect(w1['stats']['Mike']['Salary']).to.equal(511000)
    expect(w2['stats']['Mike']['Salary']).to.equal(522000)
    expect(w3['stats']['Mike']['Salary']).to.equal(533000)
  })
})
