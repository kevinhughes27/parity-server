var chai   = require('chai'),
    expect = chai.expect;

chai.use(require('sinon-chai'));
require('mocha-sinon');

var calcSalaries = require('../lib/calc_salaries');

describe("calcSalaries", function() {
  it("increase for goals", function(done) {
    stats = {
      "Mike": {
        "Goals": 1
      }
    };
    salaryDeltas = calcSalaries(stats);
    expect(salaryDeltas['Mike']['SalaryDelta']).to.equal(10000);
    done();
  });

  it("decrease for drops", function(done) {
    stats = {
      "Mike": {
        "Drops": 1
      }
    };
    salaryDeltas = calcSalaries(stats);
    expect(salaryDeltas['Mike']['SalaryDelta']).to.equal(-5000);
    done();
  });
});
