import chai from 'chai';
let expect = chai.expect;

chai.use(require('sinon-chai'));
import sinon from 'mocha-sinon';
import request from 'request-promise';

process.env.TEST = 1;
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
const db = require('monk')(process.env.MONGODB_URI)
const games = db.get('games');

var server = require('../../server');

describe("games routes", function() {
  var game = {
    week: 1,
    events: [
      "Pull\tMike"
    ]
  };

  before(async function() {
    server.listen(3001);
    await games.insert(game);
  });

  after(function() {
    games.drop();
    server.close();
  });

  describe("GET /games", function() {
    var url = 'http://localhost:3001/games';

    it("returns a list of games", async function() {
      let response = await request.get({url: url, resolveWithFullResponse: true});
      let body = JSON.parse(response.body);

      expect(response.statusCode).to.equal(200);
      expect(body[0].week).to.equal(game.week);
      expect(body[0].events).to.deep.equal(game.events);
    });
  });

  describe("GET /games/:id", function() {
    var url = 'http://localhost:3001/games/';

    it("returns a game", async function() {
      url = url + game._id
      let response = await request.get({url: url, resolveWithFullResponse: true});
      let body = JSON.parse(response.body);

      expect(response.statusCode).to.equal(200);
      expect(body.week).to.equal(game.week);
      expect(body.events).to.deep.equal(game.events);
    });
  });
});
