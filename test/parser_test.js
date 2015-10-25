var chai   = require('chai'),
    fs     = require('fs'),
    expect = chai.expect;

var parser = require('../app/parser').parser;

describe("Parser", function() {

  it("parses the input and returns the result", function() {
    testCase = require('./cases/week1_events.json');
    input = testCase.games[0].events;

    output = parser(input);

    expectedOutput = require('./cases/week1_stats.json');
    expect(output).to.deep.equal(expectedOutput);
  });

});
