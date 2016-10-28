// @flow

import express from 'express'
let router = express.Router()

const Db = require('monk')(process.env.MONGODB_URI)
const Games = Db.get('games')

/**
 * @api {get} /games List
 * @apiGroup Games
 * @apiDescription Returns an array of all the games
 * @apiSuccess (200) {Array} games returns an array of games
 */
router.get('/games', async function (req, res) {
  let games = await Games.find({}, {})
  res.json(games)
})

/**
 * @api {get} /games/:id Get
 * @apiGroup Games
 * @apiDescription Returns the data for a single game
 * @apiSuccess (200) {Object} game returns a game
 * @apiSuccessExample {json} Example Response:
 *    {
 *      "_id": "580bd3896df3906e619cd9f5",
 *      "week": 1,
 *      "teams": [
 *        "Karma Down Under": ["Alison Ward"],
 *        "Katie Parity": ["Dan Thomson"]
 *      ],
 *      "events": [
 *        "Pull,Al Colantonio"
 *      ],
 *      "stats": {
 *        "Al Colantonio": {"Pulls": 1, "SalaryDelta": 2000, "Salary": 50000}
 *      }
 *    }
 */
router.get('/games/:id', async function (req, res) {
  let game = await Games.findOne({_id: req.params.id})
  res.json(game)
})

module.exports = router
