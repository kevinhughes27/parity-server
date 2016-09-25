var _ = require('lodash');
var chai   = require('chai'),
    expect = chai.expect;

chai.use(require('sinon-chai'));
require('mocha-sinon');

process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
var db = require('mongoskin').db(process.env.MONGODB_URI);
var games = db.collection('games');
var weeks = db.collection('weeks');

var parseJob = require('../jobs/parse_job');

describe("parseJob", function() {

  var game = {
    week: 1,
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

  var game2 = {
    week: 1,
    events: [
      "Pull\tJoe",
      "Direction\t<<<<<<",
      "Drop\tMeg\tPass\tBill",
      "Direction\t>>>>>>",
      "POINT\tJoe\tPass\tJulie",
      "-1\tMeg",
      "-1\tBill",
      "+1\tJoe",
      "+1\tJulie",
      "Direction\t<<<<<<",
    ]
  };

  beforeEach(function(){
    db.dropDatabase();
  });

  after(function() {
    db.dropDatabase();
  });

  it("returns the stats", function(done) {
    games.insert(game, function(err, res) {
      stats = parseJob(game);

      expect(stats['Mike']['Pulls']).to.equal(1);
      expect(stats['Mike']['Goals']).to.equal(1);
      expect(stats['Jill']['Drops']).to.equal(1);
      done();
    });
  });

  it("calculates salary change", function(done) {
    games.insert(game, function(err, res) {
      stats = parseJob(game);

      expect(stats['Mike']['SalaryDelta']).to.equal(11000);
      expect(stats['Jill']['SalaryDelta']).to.equal(-5000);
      done();
    });
  });

  it("saves the game to mongodb", function(done) {
    games.insert(game, function(err, res) {
      parseJob(game);

      games.find().toArray(function(err, items) {
        game = items[0];
        stats = game.stats;
        expect(_.keys(stats).length).to.equal(4);
        expect(stats['Mike']['Pulls']).to.equal(1);
        expect(stats['Mike']['Goals']).to.equal(1);
        expect(stats['Jill']['Drops']).to.equal(1);
        done();
      });
    });
  });

  it("saves a new week to mongodb if week doesn't exist yet", function(done) {
    games.insert(game, function(err, res) {
      parseJob(game);

      // mongo saves are async so we need to wait
      // to make sure its there for the test
      _.delay(function() {
        weeks.find().toArray(function(err, items) {
          week = items[0];
          stats = week.stats;
          expect(_.keys(stats).length).to.equal(4);
          expect(stats['Mike']['Pulls']).to.equal(1);
          expect(stats['Mike']['Goals']).to.equal(1);
          expect(stats['Jill']['Drops']).to.equal(1);
          done();
        });
      }, 150);
    });
  });

  it("updates the week in mongodb if week exists", function(done) {
    games.insert(game, function(err, res) {
      parseJob(game);

      games.insert(game2, function(err, res) {
        parseJob(game2);

        // mongo saves are async so we need to wait
        // to make sure its there for the test
        _.delay(function() {
          weeks.find().toArray(function(err, items) {
            week = items[0];
            stats = week.stats;
            expect(_.keys(stats).length).to.equal(8);
            // game
            expect(stats['Mike']['Pulls']).to.equal(1);
            expect(stats['Mike']['Goals']).to.equal(1);
            expect(stats['Jill']['Drops']).to.equal(1);
            // game2
            expect(stats['Joe']['Pulls']).to.equal(1);
            expect(stats['Joe']['Goals']).to.equal(1);
            expect(stats['Meg']['Drops']).to.equal(1);
            done();
          });
        }, 150);
      });
    });
  });
});
