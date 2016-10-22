// @flow

import express from 'express'
let router = express.Router()

const Db = require('monk')(process.env.MONGODB_URI)
const Games = Db.get('games')

/**
 * @api {get} /games List of games
 * @apiName GetGames
 * @apiGroup Games
 *
 * @apiSuccess (200)
 */
router.get('/games', async function (req, res) {
  let games = await Games.find({}, {})
  res.json(games)
})

/**
 * @api {get} /games/:id Game
 * @apiName GetGame
 * @apiGroup Games
 *
 * @apiSuccess (200)
 */
router.get('/games/:id', async function (req, res) {
  let game = await Games.findOne({_id: req.params.id})
  res.json(game)
})

module.exports = router
