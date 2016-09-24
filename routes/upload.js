var express = require('express');
var router = express.Router();
var db = require('mongoskin').db(process.env.MONGODB_URI);
    db.bind('games');
var background = require('background-process');

/**
 * @api {post} /upload Upload Game Events
 * @apiName PostUpload
 * @apiGroup Events
 *
 * @apiParam {Array} events Array of Game Events.
 *
 * @apiSuccess (204)
 */
router.post('/upload', function(req, res) {
  game = req.body;
  game.time = new Date();

  db.games.insert(game, function(err, result) {
    background.start('jobs/parse_job.js', game);
    res.status(201).send(game);
  });
});

module.exports = router;
