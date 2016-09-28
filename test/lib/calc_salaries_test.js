import chai from 'chai';
let expect = chai.expect;

chai.use(require('sinon-chai'));
import sinon from 'mocha-sinon';

import calcSalaries from '../../lib/calc_salaries';

describe("calcSalaries", function() {
  it("increase for goals", function(done) {
    let stats = {
      "Mike": {
        "Goals": 1
      }
    };
    let salaryDeltas = calcSalaries(stats);
    expect(salaryDeltas['Mike']['SalaryDelta']).to.equal(10000);
    done();
  });

  it("decrease for drops", function(done) {
    let stats = {
      "Mike": {
        "Drops": 1
      }
    };
    let salaryDeltas = calcSalaries(stats);
    expect(salaryDeltas['Mike']['SalaryDelta']).to.equal(-5000);
    done();
  });
});
