var chai   = require('chai'),
    expect = chai.expect;

chai.use(require('sinon-chai'));
require('mocha-sinon');

var redis  = require('redis'),
    client = redis.createClient();

var parseJob = require('../jobs/parse_job');

describe("parseJob", function() {

  before(function () {
    client.flushdb();
  });

  after(function () {
    client.flushdb();
  });

  it("saves the result to redis", function(done) {
    var jobRequest = {
      events: [
        "Pull\tMike",
        "Direction\t<<<<<<",
        "Drop\tJill\tPass\tBob",
        "Direction\t>>>>>>",
        "POINT\tMike\tPass\tJane",
        "-1\tJill",
        "-1\tBob",
        "+1\tMike",
        "+1\tJane",
        "Direction\t<<<<<<",
      ]
    };

    result = parseJob(jobRequest);

    expect(result['Mike']['Pulls']).to.equal(1);
    expect(result['Mike']['Goals']).to.equal(1);
    expect(result['Jill']['Drops']).to.equal(1);
    done();
  });
});
