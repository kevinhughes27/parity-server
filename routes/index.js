var express = require('express');
var router = express.Router();

var db = require('mongoskin').db(process.env.MONGODB_URI);
    db.bind('games');

var jsonMarkup = require('json-markup');

// index route
router.get('/', function (req, res) {
  db.games.find().toArray(function(err, items) {
    items = items.map(function(game) {
      game.input_json = jsonMarkup(game.events, 2);
      game.output_json = jsonMarkup(game.stats, 2);
      return game;
    });

    res.render('index', { games: items });
  });
});

module.exports = router;
