require('dotenv').load();
var db = require('mongoskin').db(process.env.MONGODB_URI);
    db.bind('games');
var parser = require('parity-parser');

var execute = function(game) {
  stats = parser(game.events);
  db.games.updateById(game._id, {'$set': {'stats': stats}});
  return stats;
};

var background = require('background-process');
background.ready(function(err, options) {
  execute(options);
  db.close()
});

// export for testing
module.exports = execute;
