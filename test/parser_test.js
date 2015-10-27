var chai   = require('chai'),
    fs     = require('fs'),
    expect = chai.expect;

var parser = require('../app/parser');

describe("Parser", function() {

  it("parses the input and returns the result", function() {
    testCase = require('./cases/week1_events.json');
    input = testCase.games[0].events;

    output = parser(input);

    expectedOutput = require('./cases/week1_stats.json');
    expect(output).to.deep.equal(expectedOutput);
  });

  it("handles input from google apps script", function() {
    input = require('./cases/apps_script_getrange.json');
    output = parser(input);
  });
});
