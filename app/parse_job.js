var parser = require('../app/parser').parser;

// parseJob function
var parseJob = exports.parseJob = function(eventString) {
  initJobRecord();
  result = parser(eventString);
  completeJobRecord(result);
  pushToGoogleSheet();
};

var initJobRecord = function() {
  return;
}

var completeJobRecord = function(result) {
  process.stdout.write(result);
}

var pushToGoogleSheet = function() {
  return;
}

// collect args and call the main function
// before terminating the process
var eventString = process.argv[2];
parseJob(eventString);
process.exit(0);
