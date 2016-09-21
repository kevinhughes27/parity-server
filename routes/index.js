var express = require('express');
var router = express.Router();

var jsonMarkup = require('json-markup');

// index route
router.get('/', function (req, res) {
  console.log('GET /');
  var redisClient = req.app.get('redisClient');

  redisClient.lrange('results', 0, -1, function(error, items) {
    items = items.map(function(item){
      item = JSON.parse(item);
      item.input_json = jsonMarkup(item.input, 2);
      item.output_json = jsonMarkup(item.output, 2);
      return item;
    });

    res.render('index', {
      results: items
    });
  });
});

module.exports = router;
