import express from 'express';
let router = express.Router();
let db = require('mongoskin').db(process.env.MONGODB_URI);
let games = db.collection('games');

/**
 * @api {get} /games List of games
 * @apiName GetGames
 * @apiGroup Games
 *
 * @apiSuccess (200)
 */
router.get('/games', function (req, res) {
  games.find().toArray(function(err, items) {
    res.json(items);
  });
});

/**
 * @api {get} /games/:id Game
 * @apiName GetGame
 * @apiGroup Games
 *
 * @apiSuccess (200)
 */
router.get('/games/:id', function (req, res) {
  games.findById(req.params.id, function(err, item) {
    res.json(item);
  });
});

module.exports = router;