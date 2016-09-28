var chai    = require('chai'),
    expect  = chai.expect;

chai.use(require('sinon-chai'));
require('mocha-sinon');

process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
var db = require('mongoskin').db(process.env.MONGODB_URI);
var weeks = db.collection('weeks');

var request = require('request');
var server = require('../../server');
var base_url = "http://localhost:3001/";

describe("weeks routes", function() {
  var week = {
    week: 1,
    stats: {
      "Mike": { "Goals": 1 }
    }
  };

  before(function () {
    server.listen(3001);
  });

  after(function () {
    server.close();
  });

  describe("GET /weeks", function() {
    var url = base_url + 'weeks';

    it("returns a list of weeks", function(done) {
      weeks.insert(week, function(err, res) {
        request.get(url, function(error, response, body) {
          expect(response.statusCode).to.equal(200);
          body = JSON.parse(response.body);
          expect(body[0].week).to.equal(week.week);
          expect(body[0].stats).to.deep.equal(week.stats);
          done();
        });
      });
    });
  });

  describe("GET /weeks/:week", function() {
    var url = base_url + 'weeks/';

    it("returns a week", function(done) {
      weeks.insert(week, function(err, res) {
        url = url + week.week
        request.get(url, function(error, response, body) {
          expect(response.statusCode).to.equal(200);
          body = JSON.parse(response.body);
          expect(body.week).to.equal(week.week);
          expect(body.stats).to.deep.equal(week.stats);
          done();
        });
      });
    });
  });
});
