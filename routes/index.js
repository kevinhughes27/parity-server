var express = require('express');
var router = express.Router();

var db = require('mongoskin').db(process.env.MONGODB_URI);
    db.bind('games');

var jsonMarkup = require('json-markup');

// index route
router.get('/', function (req, res) {
  console.log('GET /');

  db.games.find().toArray(function(err, items) {
    items = items.map(function(item) {
      item.input_json = jsonMarkup(item.input, 2);
      item.output_json = jsonMarkup(item.output, 2);
      return item;
    });

    res.render('index', { games: items });
  });
});

module.exports = router;
