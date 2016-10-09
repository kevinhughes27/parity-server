import _ from 'lodash';
import chai from 'chai';
let expect = chai.expect;

chai.use(require('sinon-chai'));
import sinon from 'mocha-sinon';
import request from 'request-promise';

process.env.TEST = 1;
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
const db = require('monk')(process.env.MONGODB_URI)
const games = db.get('games');
const weeks = db.get('weeks');

describe("POST /upload", function() {
  var server = require('../../server');
  var url = 'http://localhost:3001/upload';

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
    games.drop();
    weeks.drop();
  });

  afterEach(function(){
    games.drop();
    weeks.drop();
  });

  after(function () {
    server.close();
  });

  it("returns status code 201", async function() {
    let response = await request.post({
      url: url,
      body: game1,
      json: true,
      resolveWithFullResponse: true
    });

    expect(response.statusCode).to.equal(201);
  });

  it("calculates the stats", async function() {
    let game = await request.post({url: url, json: true, body: game1});
    let stats = game.stats;

    expect(stats['Mike']['Pulls']).to.equal(1);
    expect(stats['Mike']['Goals']).to.equal(1);
    expect(stats['Jill']['Drops']).to.equal(1);
  });

  it("calculates salary change", async function() {
    let game = await request.post({url: url, json: true, body: game1});
    let stats = game.stats;

    expect(stats['Mike']['SalaryDelta']).to.equal(11000);
    expect(stats['Jill']['SalaryDelta']).to.equal(-5000);
  });

  it("adds the team to the stats", async function() {
    let game = await request.post({url: url, json: true, body: game1});
    let stats = game.stats;

    expect(stats['Mike']['Team']).to.equal('Team2');
    expect(stats['Jill']['Team']).to.equal('Team1');
  });

  it("players not on the roster are given Substitute as their team", async function() {
    let game = await request.post({url: url, json: true, body: game2});
    let stats = game.stats;

    expect(stats['Joe']['Team']).to.equal('Team2');
    expect(stats['Julie']['Team']).to.equal('Substitute');
  });

  it("saves the game to mongodb", async function() {
    await request.post({url: url, json: true, body: game1});

    let game = await games.findOne();
    let stats = game.stats;

    expect(_.keys(stats).length).to.equal(4);
    expect(stats['Mike']['Pulls']).to.equal(1);
    expect(stats['Mike']['Goals']).to.equal(1);
    expect(stats['Jill']['Drops']).to.equal(1);
  });

  it("saves a new week to mongodb if week doesn't exist yet", async function() {
    await request.post({url: url, json: true, body: game1});

    let week = await weeks.findOne();
    let stats = week.stats;

    expect(_.keys(stats).length).to.equal(4);
    expect(stats['Mike']['Pulls']).to.equal(1);
    expect(stats['Mike']['Goals']).to.equal(1);
    expect(stats['Jill']['Drops']).to.equal(1);
  });

  it("updates the week in mongodb if week exists", async function() {
    await request.post({url: url, json: true, body: game1});
    await request.post({url: url, json: true, body: game2});

    let week = await weeks.findOne();
    let stats = week.stats;

    expect(_.keys(stats).length).to.equal(8);

    // from game1
    expect(stats['Mike']['Pulls']).to.equal(1);
    expect(stats['Mike']['Goals']).to.equal(1);
    expect(stats['Jill']['Drops']).to.equal(1);

    // from game2
    expect(stats['Joe']['Pulls']).to.equal(1);
    expect(stats['Joe']['Goals']).to.equal(1);
    expect(stats['Meg']['Drops']).to.equal(1);
  });

  it("salary adds week to week", async function() {
    await request.post({url: url, json: true, body: game1});
    game1.week = 2;
    await request.post({url: url, json: true, body: game1});

    let week1 = await weeks.findOne({week: 1});
    let week2 = await weeks.findOne({week: 2});

    expect(week1.stats['Mike']['Salary']).to.equal(511000);
    expect(week2.stats['Mike']['Salary']).to.equal(522000);
  });
});
