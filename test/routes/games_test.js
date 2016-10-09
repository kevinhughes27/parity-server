import chai from 'chai';
let expect = chai.expect;

chai.use(require('sinon-chai'));
import sinon from 'mocha-sinon';
import request from 'request';

process.env.TEST = 1;
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
const db = require('mongoskin').db(process.env.MONGODB_URI);
const games = db.collection('games');

var server = require('../../server');
var base_url = "http://localhost:3001/";

describe("games routes", function() {
  var game = {
    week: 1,
    events: [
      "Pull\tMike"
    ]
  };

  before(function () {
    server.listen(3001);
  });

  beforeEach(function () {
    db.dropDatabase();
  });

  afterEach(function(){
    db.dropDatabase();
  });

  after(function () {
    server.close();
  });

  describe("GET /games", function() {
    var url = base_url + 'games';

    it("returns a list of games", function(done) {
      games.insert(game, function(err, res) {
        request.get(url, function(error, response, body) {
          expect(response.statusCode).to.equal(200);
          body = JSON.parse(response.body);
          expect(body[0].week).to.equal(game.week);
          expect(body[0].events).to.deep.equal(game.events);
          done();
        });
      });
    });
  });

  describe("GET /games/:id", function() {
    var url = base_url + 'games/';

    it("returns a game", function(done) {
      games.insert(game, function(err, res) {
        url = url + game._id
        request.get(url, function(error, response, body) {
          expect(response.statusCode).to.equal(200);
          body = JSON.parse(response.body);
          expect(body.week).to.equal(game.week);
          expect(body.events).to.deep.equal(game.events);
          done();
        });
      });
    });
  });
});
