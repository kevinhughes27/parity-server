require('dotenv').load();
var _ = require('underscore');
var db = require('mongoskin').db(process.env.MONGODB_URI);
    db.bind('games');
var parser = require('parity-parser');

var execute = function(params) {
  result = parser(params.events);

  db.games.insert({
    input: params,
    output: result,
    time: new Date()
  });

  return result;
};

var background = require('background-process');
background.ready(function(err, options) {
  execute(options);
  db.close()
});

// export for testing
module.exports = execute;
