var request       = require('request')
  , redis         = require('redis')
  , child_process = require('child_process')
  , chai          = require('chai')
  , expect        = chai.expect
;

chai.use(require('sinon-chai'));
require('mocha-sinon');

var server = require('../server');
var base_url = "http://localhost:3000/";

var client = redis.createClient();

describe("Server", function() {

  before(function () {
    server.listen(3000);
    client.flushdb();
  });

  after(function () {
    client.flushdb();
    server.close();
  });

  describe("GET /", function() {
    it("returns status code 200", function(done) {
      request.get(base_url, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        done();
      });
    });
  });

  describe("POST /upload", function() {
    var url = base_url + 'upload';

    it("returns status code 200", function(done) {
      request.post({url: url, json: true, body: {}}, function(error, response, body) {
        expect(response.statusCode).to.equal(201);
        done();
      });
    });

    it("spawns a job with args", function(done) {
      this.sinon.stub(child_process, 'spawn', child_process.spawn);

      request.post({url: url, json: true, body: {}}, function(error, response, body) {
        expect(child_process.spawn).to.have.been.calledWith('node', ['jobs/parse_job.js', "{}"]);
        done();
      });
    });

    it("returns the parsed result", function(done) {
      var jobRequest = {
        "events": [
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
      }

      request.post({url: url, json: true, body: jobRequest}, function(error, response, body) {
        expect(body['Mike']['Pulls']).to.equal(1);
        expect(body['Mike']['Goals']).to.equal(1);
        expect(body['Jill']['Drops']).to.equal(1);
        done();
      });
    });
  });
});
