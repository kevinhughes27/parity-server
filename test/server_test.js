var request       = require('request')
  , redis         = require('redis')
  , chai          = require('chai')
  , expect        = chai.expect
;

chai.use(require('sinon-chai'));
require('mocha-sinon');

var server = require('../server');
var base_url = "http://localhost:3000/";
var background = require('background-process');

var client = redis.createClient();

describe("server", function() {

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

    it("returns status code 202", function(done) {
      request.post({url: url, json: true, body: {}}, function(error, response, body) {
        expect(response.statusCode).to.equal(202);
        done();
      });
    });

    it("starts a background-process", function(done) {
      this.sinon.stub(background, 'start');

      request.post({url: url, json: true, body: {foo: 'bar'}}, function(error, response, body) {
        expect(background.start).to.have.been.calledWith('jobs/parse_job.js', {foo: 'bar'});
        done();
      });
    });
  });
});
