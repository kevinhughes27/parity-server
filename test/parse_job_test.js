var chai   = require('chai'),
    expect = chai.expect;

chai.use(require('sinon-chai'));
require('mocha-sinon');

process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
var db = require('mongoskin').db(process.env.MONGODB_URI);
    db.bind('games');

var parseJob = require('../jobs/parse_job');

describe("parseJob", function() {

  var game = {events: [
    "Pull\tMike",
    "Direction\t<<<<<<",
    "Drop\tJill\tPass\tBob",
    "Direction\t>>>>>>",
    "POINT\tMike\tPass\tJane",
    "-1\tJill",
    "-1\tBob",
    "+1\tMike",
    "+1\tJane",
    "Direction\t<<<<<<",
  ]};

  beforeEach(function(){
    db.dropDatabase();
  });

  after(function() {
    db.dropDatabase();
  });

  it("returns the result", function(done) {
    db.games.insert(game, function(err, res) {
      stats = parseJob(game);

      expect(stats['Mike']['Pulls']).to.equal(1);
      expect(stats['Mike']['Goals']).to.equal(1);
      expect(stats['Jill']['Drops']).to.equal(1);
      done();
    });
  });

  it("saves the result to mongodb", function(done) {
    db.games.insert(game, function(err, res) {
      parseJob(game);

      db.games.find().toArray(function(err, items) {
        game = items[0];
        stats = game.stats;
        expect(stats['Mike']['Pulls']).to.equal(1);
        expect(stats['Mike']['Goals']).to.equal(1);
        expect(stats['Jill']['Drops']).to.equal(1);
        done();
      });
    });
  });
});
