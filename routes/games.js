import express from 'express'
let router = express.Router()

const db = require('monk')(process.env.MONGODB_URI)
const games = db.get('games')

/**
 * @api {get} /games List of games
 * @apiName GetGames
 * @apiGroup Games
 *
 * @apiSuccess (200)
 */
router.get('/games', function (req, res) {
  games.find({}, {}, function (err, docs) {
    res.json(docs)
  })
})

/**
 * @api {get} /games/:id Game
 * @apiName GetGame
 * @apiGroup Games
 *
 * @apiSuccess (200)
 */
router.get('/games/:id', function (req, res) {
  games.findOne({_id: req.params.id}, function (err, item) {
    res.json(item)
  })
})

module.exports = router
