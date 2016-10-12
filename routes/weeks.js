// @flow

import express from 'express'
let router = express.Router()

const db = require('monk')(process.env.MONGODB_URI)
const weeks = db.get('weeks')

/**
 * @api {get} /weeks List of weeks
 * @apiName GetWeeks
 * @apiGroup Weeks
 *
 * @apiSuccess (200)
 */
router.get('/weeks', async function (req, res) {
  let docs = await weeks.find({}, {})
  res.json(docs)
})

/**
 * @api {get} /weeks/:week Week
 * @apiName GetWeek
 * @apiGroup Weeks
 *
 * @apiSuccess (200)
 */
router.get('/weeks/:week', async function (req, res) {
  let doc = await weeks.findOne({week: parseInt(req.params.week)})
  res.json(doc)
})

module.exports = router
