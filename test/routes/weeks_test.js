import chai from 'chai'
let expect = chai.expect

chai.use(require('sinon-chai'))
import sinon from 'mocha-sinon'
import request from 'request-promise'

process.env.TEST = 1
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
const db = require('monk')(process.env.MONGODB_URI)
const weeks = db.get('weeks')

describe('weeks routes', function () {
  var server = require('../../server')

  var week = {
    week: 1,
    stats: {
      'Mike': { 'Goals': 1 }
    }
  }

  before(async function () {
    server.listen(3001)
    await weeks.insert(week)
  })

  after(function () {
    weeks.drop()
    server.close()
  })

  describe('GET /weeks', function () {
    var url = 'http://localhost:3001/weeks'

    it('returns a list of weeks', async function () {
      let response = await request.get({url: url, resolveWithFullResponse: true})
      let body = JSON.parse(response.body)

      expect(response.statusCode).to.equal(200)
      expect(body[0].week).to.equal(week.week)
      expect(body[0].stats).to.deep.equal(week.stats)
    })
  })

  describe('GET /weeks/:week', function () {
    var url = 'http://localhost:3001/weeks/'

    it('returns a week', async function () {
      url = url + week.week
      let response = await request.get({url: url, resolveWithFullResponse: true})
      let body = JSON.parse(response.body)

      expect(response.statusCode).to.equal(200)
      expect(body.week).to.equal(week.week)
      expect(body.stats).to.deep.equal(week.stats)
    })
  })
})
