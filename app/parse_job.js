var parser = require('../app/parser').parser;

// parseJob function
var parseJob = exports.parseJob = function(eventString) {
  result = parser(eventString);
  process.stdout.write(result);
};

// collect args and call the main function
// before terminating the process
var eventString = process.argv[2];
parseJob(eventString);
process.exit(0);
