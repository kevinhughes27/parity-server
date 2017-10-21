import chai from 'chai'
let expect = chai.expect

chai.use(require('sinon-chai'))
import request from 'request-promise'

process.env.TEST = 1
process.env.PORT = 3002
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
const Db = require('monk')(process.env.MONGODB_URI)
const Games = Db.get('games')

describe('games routes', function () {
  var server = require('../../index')

  var game = {
    week: 1,
    events: [
      'Pull,Mike'
    ]
  }

  before(async function () {
    server.listen(3002)
    await Games.insert(game)
  })

  after(function () {
    Games.drop()
    server.close()
  })

  describe('GET /games', function () {
    var url = 'http://localhost:3002/games'

    it('returns a list of games', async function () {
      let response = await request.get({url: url, resolveWithFullResponse: true})
      let body = JSON.parse(response.body)

      expect(response.statusCode).to.equal(200)
      expect(body[0].week).to.equal(game.week)
      expect(body[0].events).to.deep.equal(game.events)
    })
  })

  describe('GET /games/:id', function () {
    var url = 'http://localhost:3002/games/'

    it('returns a game', async function () {
      url = url + game._id
      let response = await request.get({url: url, resolveWithFullResponse: true})
      let body = JSON.parse(response.body)

      expect(response.statusCode).to.equal(200)
      expect(body.week).to.equal(game.week)
      expect(body.events).to.deep.equal(game.events)
    })
  })
})
