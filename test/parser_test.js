var chai   = require('chai'),
    expect = chai.expect;

var parser = require('../app/parser').parser;

describe("Parser", function() {

  it("parses the input and returns the result", function() {
    input = "eventString";

    output = parser(input);

    expectedOutput = "eventString";
    expect(output).to.equal(expectedOutput);
  });

});
