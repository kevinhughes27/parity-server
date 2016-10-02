var chai    = require('chai'),
    expect  = chai.expect;

chai.use(require('sinon-chai'));
require('mocha-sinon');

process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
var _ = require('lodash');
var db = require('mongoskin').db(process.env.MONGODB_URI);
var games = db.collection('games');
var weeks = db.collection('weeks');

var request = require('request');
var server = require('../../server');
var base_url = "http://localhost:3001/";

describe("POST /upload", function() {
  var url = base_url + 'upload';

  var game1 = {
    week: 1,
    events: [
      "Pull\tMike",
      "Direction\t>>>>>>",
      "Direction\t<<<<<<\tDrop\tJill\tPass\tBob",
      "Direction\t>>>>>>\tPOINT\tMike\tPass\tJane",
      "O-\tJill\tD+\tMike",
      "O-\tBob\tD+\tJane"
    ]
  };

  var game2 = {
    week: 1,
    events: [
      "Pull\tJoe",
      "Direction\t>>>>>>",
      "Direction\t<<<<<<\tDrop\tMeg\tPass\tBill",
      "Direction\t>>>>>>\tPOINT\tJoe\tPass\tJulie",
      "O-\tMeg\tD+\tJoe",
      "O-\tBill\tD+\tJulie"
    ]
  };

  before(function () {
    db.dropDatabase();
    server.listen(3001);
  });

  after(function () {
    server.close();
    db.dropDatabase();
  });

  it("returns status code 201", function(done) {
    request.post({url: url, json: true, body: game1}, function(error, response, body) {
      expect(response.statusCode).to.equal(201);
      done();
    });
  });

  it("calculates the stats", function(done) {
    request.post({url: url, json: true, body: game1}, function(error, response, game) {
      let stats = game.stats;

      expect(stats['Mike']['Pulls']).to.equal(1);
      expect(stats['Mike']['Goals']).to.equal(1);
      expect(stats['Jill']['Drops']).to.equal(1);
      done();
    });
  });

  it("calculates salary change", function(done) {
    request.post({url: url, json: true, body: game1}, function(error, response, game) {
      let stats = game.stats;

      expect(stats['Mike']['SalaryDelta']).to.equal(11000);
      expect(stats['Jill']['SalaryDelta']).to.equal(-5000);
      done();
    });
  });

  it("saves the game to mongodb", function(done) {
    request.post({url: url, json: true, body: game1}, function(error, response, body) {
      games.find().toArray(function(err, items) {
        let game = items[0];
        let stats = game.stats;
        expect(_.keys(stats).length).to.equal(4);
        expect(stats['Mike']['Pulls']).to.equal(1);
        expect(stats['Mike']['Goals']).to.equal(1);
        expect(stats['Jill']['Drops']).to.equal(1);
        done();
      });
    });
  });

  it("saves a new week to mongodb if week doesn't exist yet", function(done) {
    request.post({url: url, json: true, body: game1}, function(error, response, body) {
      weeks.find().toArray(function(err, items) {
        let week = items[0];
        let stats = week.stats;
        expect(_.keys(stats).length).to.equal(4);
        expect(stats['Mike']['Pulls']).to.equal(1);
        expect(stats['Mike']['Goals']).to.equal(1);
        expect(stats['Jill']['Drops']).to.equal(1);
        done();
      });
    });
  });

  it("updates the week in mongodb if week exists", function(done) {
    request.post({url: url, json: true, body: game1}, function(error, response, body) {
      request.post({url: url, json: true, body: game2}, function(error, response, body) {
        weeks.find().toArray(function(err, items) {
          let week = items[0];
          let stats = week.stats;
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
      });
    });
  });
});
