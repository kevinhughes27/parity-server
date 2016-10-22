// @flow

import express from 'express'
let router = express.Router()

const Db = require('monk')(process.env.MONGODB_URI)
const Games = Db.get('games')

import calcWeek from '../lib/calc_week'

/**
 * @api {get} /weeks List of weeks
 * @apiName GetWeeks
 * @apiGroup Weeks
 *
 * @apiSuccess (200)
 */
router.get('/weeks', async function (req, res) {
  let weeks = await Games.distinct('week')
  res.json(weeks)
})

/**
 * @api {get} /weeks/:week Week
 * @apiName GetWeek
 * @apiGroup Weeks
 *
 * @apiSuccess (200)
 */
router.get('/weeks/:week', async function (req, res) {
  let weekNum = parseInt(req.params.week)
  let week = await calcWeek(weekNum)
  res.json(week)
})

module.exports = router
