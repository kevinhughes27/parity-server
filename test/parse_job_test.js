var chai   = require('chai'),
    expect = chai.expect;

chai.use(require('sinon-chai'));
require('mocha-sinon');

process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
var db = require('mongoskin').db(process.env.MONGODB_URI);
    db.bind('games');

var parseJob = require('../jobs/parse_job');

describe("parseJob", function() {

  before(function () {
    db.dropDatabase();
  });

  after(function () {
    db.dropDatabase();
  });

  var params = {
    events: [
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
    ]
  };

  it("returns the result", function(done) {
    result = parseJob(params);

    expect(result['Mike']['Pulls']).to.equal(1);
    expect(result['Mike']['Goals']).to.equal(1);
    expect(result['Jill']['Drops']).to.equal(1);
    done();
  });

  it("saves the result to mongodb", function(done) {
    parseJob(params);

    db.games.find().toArray(function(err, items) {
      game = items[0];
      result = game.output;
      expect(result['Mike']['Pulls']).to.equal(1);
      expect(result['Mike']['Goals']).to.equal(1);
      expect(result['Jill']['Drops']).to.equal(1);
      done();
    });
  });
});
