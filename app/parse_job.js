var parser = require('../app/parser').parser;

var parseJob = exports.parseJob = function(eventString) {
  result = parser(eventString);
  process.stdout.write(result);
};

var eventString = process.argv[2];
parseJob(eventString);
process.exit(0);
