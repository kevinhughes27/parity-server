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
      request(base_url, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        done();
      });
    });

    it("returns ParityServer!", function(done) {
      request(base_url, function(error, response, body) {
        expect(body).to.equal("ParityServer!");
        done();
      });
    });
  });

});
