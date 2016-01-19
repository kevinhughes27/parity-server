var chai   = require('chai'),
    fs     = require('fs'),
    expect = chai.expect;

var parser = require('../app/parser');

describe("Parser", function() {

  it("parses stat: Pulls (array)", function() {
    input = [["Pull", "Jill"], ["Direction", ">>>>>>"]];
    output = parser(input);
    expect(output['Jill']['Pulls']).to.equal(1);
  });

  it("parses stat: Pulls (string)", function() {
    input = ["Pull\tJill", "Direction\t>>>>>>"];
    output = parser(input);
    expect(output['Jill']['Pulls']).to.equal(1);
  });

  it("parses stat: Pick-Ups (array)", function() {
    input = [["POINT", "Jill", "Pass", "Bob"]];
    output = parser(input);
    expect(output['Bob']['Pick-Ups']).to.equal(1);
  });

  it("parses stat: Pick-Ups (string)", function() {
    input = ["POINT\tJill\tPass\tBob",];
    output = parser(input);
    expect(output['Bob']['Pick-Ups']).to.equal(1);
  });

  it("parses stat: Goals (array)", function() {
    input = [["POINT", "Jill"]];
    output = parser(input);
    expect(output['Jill']['Goals']).to.equal(1);
  });

  it("parses stat: Goals (string)", function() {
    input = ["POINT\tJill"];
    output = parser(input);
    expect(output['Jill']['Goals']).to.equal(1);
  });

  it("parses stat: Assists (array)", function() {
    input = [["POINT", "Jill", "Pass", "Bob"]];
    output = parser(input);
    expect(output['Bob']['Assists']).to.equal(1)
  });

  it("parses stat: Assists (string)", function() {
    input = ["POINT\tJill\tPass\tBob"];
    output = parser(input);
    expect(output['Bob']['Assists']).to.equal(1);
  });

  it("parses stat: 2nd Assists (array)", function() {
    input = [["POINT", "Jill", "Pass", "Bob", 'Pass', 'Jim']];
    output = parser(input);
    expect(output['Jim']['2nd Assist']).to.equal(1)
  });

  it("parses stat: 2nd Assists (string)", function() {
    input = ["POINT\tJill\tPass\tBob\tPass\tJim"];
    output = parser(input);
    expect(output['Jim']['2nd Assist']).to.equal(1);
  });

  it("parses stat: 3rd Assists (array)", function() {
    input = [["POINT", "Jill", "Pass", "Bob", 'Pass', 'Jim', 'Pass', 'Bob']];
    output = parser(input);
    expect(output['Bob']['3rd Assist']).to.equal(1)
  });

  it("parses stat: 3rd Assists (string)", function() {
    input = ["POINT\tJill\tPass\tBob\tPass\tJim\tPass\tBob"];
    output = parser(input);
    expect(output['Bob']['3rd Assist']).to.equal(1);
  });

  it("parses stat: 4th Assists (array)", function() {
    input = [["POINT", "Jill", "Pass", "Bob", 'Pass', 'Jim', 'Pass', 'Bob', 'Pass', 'Jim']];
    output = parser(input);
    expect(output['Jim']['4th Assist']).to.equal(1)
  });

  it("parses stat: 4th Assists (string)", function() {
    input = ["POINT\tJill\tPass\tBob\tPass\tJim\tPass\tBob\tPass\tJim"];
    output = parser(input);
    expect(output['Jim']['4th Assist']).to.equal(1);
  });

  it("parses stat: 5th Assists (array)", function() {
    input = [["POINT", "Jill", "Pass", "Bob", 'Pass', 'Jim', 'Pass', 'Bob', 'Pass', 'Jim', 'Pass', 'Bob']];
    output = parser(input);
    expect(output['Bob']['5th Assist']).to.equal(1)
  });

  it("parses stat: 5th Assists (string)", function() {
    input = ["POINT\tJill\tPass\tBob\tPass\tJim\tPass\tBob\tPass\tJim\tPass\tBob"];
    output = parser(input);
    expect(output['Bob']['5th Assist']).to.equal(1);
  });

  it("parses stat: D-Blocks (array)", function() {
    input = [["D", "Jill"]];
    output = parser(input);
    expect(output['Jill']['D-Blocks']).to.equal(1)
  });

  it("parses stat: D-Blocks (string)", function() {
    input = ["D\tJill"];
    output = parser(input);
    expect(output['Jill']['D-Blocks']).to.equal(1);
  });

  it("parses stat: Completions (array) 1", function() {
    input = [["POINT", "Jill", 'Pass', 'Bob']];
    output = parser(input);
    expect(output['Bob']['Completions']).to.equal(1)
  });

  it("parses stat: Completions (string) 1", function() {
    input = ["POINT\tJill\tPass\tBob"];
    output = parser(input);
    expect(output['Bob']['Completions']).to.equal(1);
  });

  it("parses stat: Completions (array) 2", function() {
    input = [["POINT", "Jill", 'Pass', 'Bob', 'Pass', 'Jim', 'Pass', 'Bob']];
    output = parser(input);
    expect(output['Bob']['Completions']).to.equal(2)
  });

  it("parses stat: Completions (string) 2", function() {
    input = ["POINT\tJill\tPass\tBob\tPass\tJim\tPass\tBob\tPass\tJim"];
    output = parser(input);
    expect(output['Bob']['Completions']).to.equal(2);
  });

  it("parses stat: Catches (array) 1", function() {
    input = [["POINT", "Jill", 'Pass', 'Bob']];
    output = parser(input);
    expect(output['Jill']['Catches']).to.equal(1)
  });

  it("parses stat: Catches (string) 1", function() {
    input = ["POINT\tJill\tPass\tBob"];
    output = parser(input);
    expect(output['Jill']['Catches']).to.equal(1);
  });

  it("parses stat: Catches (array) 2", function() {
    input = [["POINT", "Jill", 'Pass', 'Bob', 'Pass', 'Jill', 'Pass', 'Bob']];
    output = parser(input);
    expect(output['Jill']['Catches']).to.equal(2)
  });

  it("parses stat: Catches (string) 2", function() {
    input = ["POINT\tJill\tPass\tBob\tPass\tJill\tPass\tBob"];
    output = parser(input);
    expect(output['Jill']['Catches']).to.equal(2);
  });

  it("parses stat: Throwaways (array)", function() {
    input = [["Throw Away", "Jill", 'Pass', 'Bob']];
    output = parser(input);
    expect(output['Jill']['Throwaways']).to.equal(1)
  });

  it("parses stat: Throwaways (string)", function() {
    input = ["Throw Away\tJill\tPass\tBob"];
    output = parser(input);
    expect(output['Jill']['Throwaways']).to.equal(1);
  });

  it("parses stat: ThrewDrop & Drop (array)", function() {
    input = [["Drop", "Jill", 'Pass', 'Bob']];
    output = parser(input);
    expect(output['Bob']['ThrewDrop']).to.equal(1)
    expect(output['Jill']['Drops']).to.equal(1);
  });

  it("parses stat: ThrewDrop & Drop (string)", function() {
    input = ["Drop\tJill\tPass\tBob"];
    output = parser(input);
    expect(output['Bob']['ThrewDrop']).to.equal(1);
    expect(output['Jill']['Drops']).to.equal(1);
  });

  it("parses stat: Callahan (array)", function() {
    input = [["POINT", "Jill"]];
    output = parser(input);
    expect(output['Jill']['Goals']).to.equal(1);
    expect(output['Jill']['Calihan']).to.equal(1);
  });

  it("parses stat: Callahan (string)", function() {
    input = ["POINT\tJill"];
    output = parser(input);
    expect(output['Jill']['Goals']).to.equal(1);
    expect(output['Jill']['Calihan']).to.equal(1);
  });

  it("parses stat: OPointsFor (array)", function() {
    input = [["Direction", "<<<<<<"], ["POINT", "Jill"], ["1", "Jill"]];
    output = parser(input);
    expect(output['Jill']['OPointsFor']).to.equal(1);
  });

  it("parses stat: OPointsFor (string)", function() {
    input = ["Direction\t<<<<<<", "POINT\tJill", "1\tJill"];
    output = parser(input);
    expect(output['Jill']['OPointsFor']).to.equal(1);
  });

  it("parses stat: DPointsAgainst (array)", function() {
    input = [["Direction", "<<<<<<"], ["POINT", "Jill"], ["1", "Jill"], ['-1', 'Jane']];
    output = parser(input);
    expect(output['Jane']['DPointsAgainst']).to.equal(1);
  });

  it("parses stat: DPointsAgainst (string)", function() {
    input = ["Direction\t<<<<<<", "POINT\tJill", "1\tJill", "-1\tJane"];
    output = parser(input);
    expect(output['Jane']['DPointsAgainst']).to.equal(1);
  });

  it("parses stat: OPointsAgainst (array)", function() {
    input = [
      ["Direction", "<<<<<<"],
      ["DROP", "Jill", 'Pass', 'Bob'],
      ["Direction", ">>>>>>"],
      ["POINT", 'Mike', 'Pass', 'Jane'],
      ["-1", "Jill"],
      ["-1", "Bob"],
      ["+1", "Mike"],
      ["+1", "Jane"],
    ];

    output = parser(input);
    expect(output['Bob']['OPointsAgainst']).to.equal(1);
    expect(output['Jill']['OPointsAgainst']).to.equal(1);
  });

  it("parses stat: OPointsAgainst (string)", function() {
    input = [
      "Direction\t<<<<<<",
      "DROP\tJill\tPass\tBob",
      "Direction\t>>>>>>",
      "POINT\tMike\tPass\tJane",
      "-1\tJill",
      "-1\tBob",
      "+1\tMike",
      "+1\tJane",
    ];

    output = parser(input);
    expect(output['Bob']['OPointsAgainst']).to.equal(1);
    expect(output['Jill']['OPointsAgainst']).to.equal(1);
  });

  it("parses stat: DPointsFor (array)", function() {
    input = [
      ["Direction", "<<<<<<"],
      ["DROP", "Jill", 'Pass', 'Bob'],
      ["Direction", ">>>>>>"],
      ["POINT", 'Mike', 'Pass', 'Jane'],
      ["-1", "Jill"],
      ["-1", "Bob"],
      ["+1", "Mike"],
      ["+1", "Jane"],
    ];

    output = parser(input);
    expect(output['Jane']['DPointsFor']).to.equal(1);
    expect(output['Mike']['DPointsFor']).to.equal(1);
  });

  it("parses stat: DPointsFor (string)", function() {
    input = [
      "Direction\t<<<<<<",
      "DROP\tJill\tPass\tBob",
      "Direction\t>>>>>>",
      "POINT\tMike\tPass\tJane",
      "-1\tJill",
      "-1\tBob",
      "+1\tMike",
      "+1\tJane",
    ];

    output = parser(input);
    expect(output['Jane']['DPointsFor']).to.equal(1);
    expect(output['Mike']['DPointsFor']).to.equal(1);
  });

  it("empty array cells are ignored", function() {
    input = [["", "", "POINT", "Jill"]];
    output = parser(input);
    expect(output['Jill']['Goals']).to.equal(1);
  });

  it("extra spaces are ignored", function() {
    input = ["    POINT\tJill"];
    output = parser(input);
    expect(output['Jill']['Goals']).to.equal(1);
  });
});
