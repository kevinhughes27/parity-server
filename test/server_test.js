var chai    = require('chai'),
    expect  = chai.expect;

chai.use(require('sinon-chai'));
require('mocha-sinon');

var request = require('request');
var server = require('../server');
var base_url = "http://localhost:3001/";
var background = require('background-process');

describe("server", function() {

  before(function () {
    server.listen(3001);
  });

  after(function () {
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

    it("saves a new game document", function(done) {
      done();
    });

    it("starts a background-process", function(done) {
      this.sinon.stub(background, 'start');
      params = {events: []};

      request.post({url: url, json: true, body: params}, function(error, response, body) {
        expect(background.start).to.have.been.calledWith('jobs/parse_job.js');
        done();
      });
    });

    it("returns status code 201", function(done) {
      request.post({url: url, json: true, body: {}}, function(error, response, body) {
        expect(response.statusCode).to.equal(201);
        done();
      });
    });
  });
});
