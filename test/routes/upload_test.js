var chai    = require('chai'),
    expect  = chai.expect;

chai.use(require('sinon-chai'));
require('mocha-sinon');

process.env.TEST = 1;
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
    teams: {
      'Team1': [
        'Jill',
        'Bob'
      ],
      'Team2': [
        'Mike',
        'Jane'
      ]
    },
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
    teams: {
      Team1: [
        'Meg',
        'Bill',
      ],
      Team2: [
        'Joe'
      ]
    },
    events: [
      "Pull\tJoe",
      "Direction\t>>>>>>",
      "Direction\t<<<<<<\tDrop\tMeg\tPass\tBill",
      "Direction\t>>>>>>\tPOINT\tJoe\tPass\tJulie",
      "O-\tMeg\tD+\tJoe",
      "O-\tBill\tD+\tJulie"
    ]
  };

  before(function() {
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

  it("adds the team to the stats", function(done) {
    request.post({url: url, json: true, body: game1}, function(error, response, game) {
      let stats = game.stats;

      expect(stats['Mike']['Team']).to.equal('Team2');
      expect(stats['Jill']['Team']).to.equal('Team1');
      done();
    });
  });

  it("players not on the roster are given Substitute as their team", function(done) {
    request.post({url: url, json: true, body: game2}, function(error, response, game) {
      let stats = game.stats;

      expect(stats['Joe']['Team']).to.equal('Team2');
      expect(stats['Julie']['Team']).to.equal('Substitute');
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

  it("salary adds week to week", function(done) {
    request.post({url: url, json: true, body: game1}, function(error, response, body) {
      game1.week = 2;
      request.post({url: url, json: true, body: game1}, function(error, response, body) {
        weeks.find().toArray(function(err, items) {
          let week1 = items[0].stats;
          let week2 = items[1].stats;
          expect(week1['Mike']['Salary']).to.equal(511000);
          expect(week2['Mike']['Salary']).to.equal(522000);
          done();
        });
      });
    });
  });
});
