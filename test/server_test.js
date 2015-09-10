var request = require("request");
var expect  = require("chai").expect;

var server = require('../app/server');
var base_url = "http://localhost:3000/";

describe("Server", function() {

  before(function () {
    server.listen(3000);
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

    it("returns ParityServer!", function(done) {
      request.get(base_url, function(error, response, body) {
        expect(body).to.equal("ParityServer!");
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

    it("returns the event string ('job' communication works!)", function(done) {
      request.post({url: url, json: true, body: {event_string: str}}, function(error, response, body) {
        expect(body).to.equal(str+"\n");
        done();
      });
    });
  });
});
