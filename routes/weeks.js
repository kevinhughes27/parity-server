// @flow

import express from 'express'
let router = express.Router()

const Db = require('monk')(process.env.MONGODB_URI)
const Games = Db.get('games')

import _ from 'lodash'
import calcWeek from '../lib/calc_week'

/**
 * @api {get} /weeks List
 * @apiGroup Weeks
 * @apiDescription Returns an array of week numbers. This is calculated by
 * a distinct query on game.week
 * @apiSuccess (200) {Array} weeks returns an array of week numbers
 * @apiSuccessExample {json} Example Response:
 *    [
 *      1,
 *      2,
 *      3
 *    ]
 */
router.get('/weeks', async function (req, res) {
  let weeks = await Games.distinct('week')
  weeks = _.sortBy(weeks)
  res.json(weeks)
})

/**
 * @api {get} /weeks/:week Get
 * @apiGroup Weeks
 * @apiDescription Returns all the stats for the given week. The week is
 * calculated by merging all the games from that week.
 * @apiSuccess (200) {Object} week returns a week
 * @apiSuccessExample {json} Example Response:
 *    {
 *      "week": 1,
 *      "stats": {
 *        "Al Colantonio": {"Pulls": 1, "SalaryDelta": 2000, "Salary": 50000}
 *      }
 *    }
 */
router.get('/weeks/:week', async function (req, res) {
  let weekNum = parseInt(req.params.week)
  let week = await calcWeek(weekNum)
  res.json(week)
})

module.exports = router
