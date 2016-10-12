// @flow

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
router.get('/games', async function (req, res) {
  let docs = await games.find({}, {})
  res.json(docs)
})

/**
 * @api {get} /games/:id Game
 * @apiName GetGame
 * @apiGroup Games
 *
 * @apiSuccess (200)
 */
router.get('/games/:id', async function (req, res) {
  let doc = await games.findOne({_id: req.params.id})
  res.json(doc)
})

module.exports = router
