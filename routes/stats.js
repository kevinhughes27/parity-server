// @flow

import express from 'express'
let router = express.Router()

const Db = require('monk')(process.env.MONGODB_URI)
const Games = Db.get('games')

import calcTotalStats from '../lib/calc_total_stats'

/**
 * @api {get} /stats Cumulative
 * @apiGroup Weeks
 * @apiDescription Returns the summed stats for all weeks keeping the latest salary.
 * This response is calculated by summing all the games.
 * @apiSuccess (200) {Object} stats returns the summed stats for all weeks
 * @apiSuccessExample {json} Example Response:
 *    {
 *      "stats": {
 *        "Al Colantonio": {"Pulls": 2, "SalaryDelta": 2000, "Salary": 50000}
 *      }
 *    }
 */
router.get('/stats', async function (req, res) {
  let games = await Games.find({}, {sort: {week: -1}})
  let stats = calcTotalStats(games)
  res.json({stats})
})

module.exports = router
