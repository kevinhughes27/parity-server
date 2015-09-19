var request       = require('request')
  , redis         = require('redis')
  , child_process = require('child_process')
  , chai          = require('chai')
  , expect        = chai.expect
;

chai.use(require('sinon-chai'));
require('mocha-sinon');

var server = require('../app/server');
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

    it("returns contents of the results list", function(done) {
      request.get(base_url, function(error, response, body) {
        expect(body).to.equal("[]");
        done();
      });
    });
  });

  describe("POST /upload", function() {
    var url = base_url + 'upload';
    var str = 'event_string';

    it("returns status code 200", function(done) {
      request.post({url: url, json: true, body: {event_string: str}}, function(error, response, body) {
        expect(response.statusCode).to.equal(201);
        done();
      });
    });

    it("spawns a job with args", function(done) {
      this.sinon.stub(child_process, 'spawn', child_process.spawn);

      request.post({url: url, json: true, body: {event_string: str}}, function(error, response, body) {
        expect(child_process.spawn).to.have.been.calledWith('node', ['app/parse_job.js', str]);
        done();
      });
    });

    it("returns the event string ('job' communication works!)", function(done) {
      request.post({url: url, json: true, body: {event_string: str}}, function(error, response, body) {
        expect(body).to.equal(str);
        done();
      });
    });
  });
});
