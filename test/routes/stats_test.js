import chai from 'chai'
let expect = chai.expect

chai.use(require('sinon-chai'))
import request from 'request-promise'

process.env.TEST = 1
process.env.PORT = 3002
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
const Db = require('monk')(process.env.MONGODB_URI)
const Games = Db.get('games')

describe('stats route', function () {
  var server = require('../../server')

  var game1 = {
    week: 1,
    stats: {
      'Mike': { 'Goals': 1, 'Salaray': 1000 }
    }
  }

  var game2 = {
    week: 2,
    stats: {
      'Mike': { 'Goals': 1, 'D-Block': 1, 'Salary': 2000 }
    }
  }

  before(async function () {
    server.listen(3002)
    await Games.insert(game1)
    await Games.insert(game2)
  })

  after(function () {
    Games.drop()
    server.close()
  })

  describe('GET /stats', function () {
    var url = 'http://localhost:3002/stats'

    it('returns the all the stats (summed up) so far', async function () {
      let response = await request.get({url: url, resolveWithFullResponse: true})
      let body = JSON.parse(response.body)
      let stats = body.stats

      expect(response.statusCode).to.equal(200)
      expect(stats['Mike']['Goals']).to.equal(2)
      expect(stats['Mike']['D-Block']).to.equal(1)
      expect(stats['Mike']['Salary']).to.equal(2000)
    })
  })
})
