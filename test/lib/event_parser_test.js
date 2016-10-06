import chai from 'chai';
let expect = chai.expect;

import parser from '../../lib/event_parser';

describe("Parser", function() {

  it("parses stat: Pulls", function() {
    let input = ["Pull\tJill", "Direction\t>>>>>>"];
    let output = parser(input);
    expect(output['Jill']['Pulls']).to.equal(1);
  });

  it("parses stat: Pick-Ups", function() {
    let input = ["Direction\t>>>>>>\tPOINT\tJill\tPass\tBob",];
    let output = parser(input);
    expect(output['Bob']['Pick-Ups']).to.equal(1);
  });

  it("parses stat: Goals", function() {
    let input = ["Direction\t>>>>>>\tPOINT\tJill"];
    let output = parser(input);
    expect(output['Jill']['Goals']).to.equal(1);
  });

  it("parses stat: Assists", function() {
    let input = ["Direction\t>>>>>>\tPOINT\tJill\tPass\tBob"];
    let output = parser(input);
    expect(output['Bob']['Assists']).to.equal(1);
  });

  it("parses stat: 2nd Assists", function() {
    let input = ["Direction\t>>>>>>\tPOINT\tJill\tPass\tBob\tPass\tJim"];
    let output = parser(input);
    expect(output['Jim']['2nd Assist']).to.equal(1);
  });

  it("parses stat: 3rd Assists", function() {
    let input = ["Direction\t>>>>>>\tPOINT\tJill\tPass\tBob\tPass\tJim\tPass\tBob"];
    let output = parser(input);
    expect(output['Bob']['3rd Assist']).to.equal(1);
  });

  it("parses stat: 4th Assists", function() {
    let input = ["Direction\t>>>>>>\tPOINT\tJill\tPass\tBob\tPass\tJim\tPass\tBob\tPass\tJim"];
    let output = parser(input);
    expect(output['Jim']['4th Assist']).to.equal(1);
  });

  it("parses stat: 5th Assists", function() {
    let input = ["Direction\t>>>>>>\tPOINT\tJill\tPass\tBob\tPass\tJim\tPass\tBob\tPass\tJim\tPass\tBob"];
    let output = parser(input);
    expect(output['Bob']['5th Assist']).to.equal(1);
  });

  it("parses stat: D-Blocks", function() {
    let input = ["D\tJill"];
    let output = parser(input);
    expect(output['Jill']['D-Blocks']).to.equal(1);
  });

  it("parses stat: Completions 1", function() {
    let input = ["Direction\t>>>>>>\tPOINT\tJill\tPass\tBob"];
    let output = parser(input);
    expect(output['Bob']['Completions']).to.equal(1);
  });

  it("parses stat: Completions 2", function() {
    let input = ["Direction\t>>>>>>\tPOINT\tJill\tPass\tBob\tPass\tJim\tPass\tBob\tPass\tJim"];
    let output = parser(input);
    expect(output['Bob']['Completions']).to.equal(2);
  });

  it("parses stat: Completions (jagged array)", function() {
    let input = [
      "Direction\t>>>>>>\tPOINT\tJill\tPass\tBob",
      "Direction\t>>>>>>\tPOINT\tJill\tPass\tBob\tPass\tJim\tPass\tBob\tPass\tJim"
    ];

    let output = parser(input);
    expect(output['Bob']['Completions']).to.equal(3);
  });

  it("parses stat: Catches 1", function() {
    let input = ["Direction\t>>>>>>\tPOINT\tJill\tPass\tBob"];
    let output = parser(input);
    expect(output['Jill']['Catches']).to.equal(1);
  });

  it("parses stat: Catches 2", function() {
    let input = ["Direction\t>>>>>>\tPOINT\tJill\tPass\tBob\tPass\tJill\tPass\tBob"];
    let output = parser(input);
    expect(output['Jill']['Catches']).to.equal(2);
  });

  it("parses stat: Throwaways", function() {
    let input = ["Direction\t>>>>>>\tThrow Away\tJill\tPass\tBob"];
    let output = parser(input);
    expect(output['Jill']['Throwaways']).to.equal(1);
  });

  it("parses stat: ThrewDrop & Drop", function() {
    let input = ["Direction\t>>>>>>\tDrop\tJill\tPass\tBob"];
    let output = parser(input);
    expect(output['Bob']['ThrewDrop']).to.equal(1);
    expect(output['Jill']['Drops']).to.equal(1);
  });

  it("parses stat: Callahan", function() {
    let input = ["Direction\t>>>>>>\tPOINT\tJill"];
    let output = parser(input);
    expect(output['Jill']['Goals']).to.equal(1);
    expect(output['Jill']['Calihan']).to.equal(1);
  });

  it("parses stat: OPointsFor", function() {
    let input = ["Direction\t<<<<<<\tPOINT\tJill", "O+\tJill\tD-\tJane"];
    let output = parser(input);
    expect(output['Jill']['OPointsFor']).to.equal(1);
  });

  it("parses stat: DPointsAgainst", function() {
    let input = ["Direction\t<<<<<<\tPOINT\tJill", "O+\tJill\tD-\tJane"];
    let output = parser(input);
    expect(output['Jane']['DPointsAgainst']).to.equal(1);
  });

  it("parses stat: OPointsAgainst", function() {
    let input = [
      "Direction\t<<<<<<\tDrop\tJill\tPass\tBob",
      "Direction\t>>>>>>\tPOINT\tMike\tPass\tJane",
      "O-\tJill\tD+\tMike",
      "O-\tBob\tD+\tJane"
    ];

    let output = parser(input);
    expect(output['Bob']['OPointsAgainst']).to.equal(1);
    expect(output['Jill']['OPointsAgainst']).to.equal(1);
  });

  it("parses stat: DPointsFor", function() {
    let input = [
      "Direction\t<<<<<<\tDrop\tJill\tPass\tBob",
      "Direction\t>>>>>>\tPOINT\tMike\tPass\tJane",
      "O-\tJill\tD+\tMike",
      "O-\tBob\tD+\tJane"
    ];

    let output = parser(input);
    expect(output['Jane']['DPointsFor']).to.equal(1);
    expect(output['Mike']['DPointsFor']).to.equal(1);
  });

  it("parses test game A", function() {
    let input = [
      "Pull\tMike",
      "Direction\t<<<<<<\tDrop\tJill\tPass\tBob",
      "Direction\t>>>>>>\tPOINT\tMike\tPass\tJane",
      "O-\tJill\tD+\tMike",
      "O-\tBob\tD+\tJane",
      "Direction\t<<<<<<\tPOINT\tJill\tPass\tBob\tJill",
      "O+\tJill\tD-\tMike",
      "O+\tBob\tD-\tJane",
      "Direction\t>>>>>>\tThrow Away\tJane"
    ];

    let output = parser(input);

    expect(output['Jane']['DPointsFor']).to.equal(1);
    expect(output['Mike']['DPointsFor']).to.equal(1);
    expect(output['Jane']['DPointsAgainst']).to.equal(1);
    expect(output['Mike']['DPointsAgainst']).to.equal(1);

    expect(output['Bob']['OPointsAgainst']).to.equal(1);
    expect(output['Jill']['OPointsAgainst']).to.equal(1);
    expect(output['Bob']['OPointsFor']).to.equal(1);
    expect(output['Jill']['OPointsFor']).to.equal(1);

    expect(output['Mike']['Goals']).to.equal(1);
    expect(output['Jill']['Goals']).to.equal(1);

    expect(output['Jane']['Assists']).to.equal(1);
    expect(output['Bob']['Assists']).to.equal(1);

    expect(output['Jane']['Throwaways']).to.equal(1);
    expect(output['Mike']['Pulls']).to.equal(1);
    expect(output['Jill']['Drops']).to.equal(1);
  });

  it("extra spaces are ignored", function() {
    let input = ["    Direction\t>>>>>>\tPOINT\tJill"];
    let output = parser(input);
    expect(output['Jill']['Goals']).to.equal(1);
  });
});
