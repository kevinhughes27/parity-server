// @flow

import express from 'express'
let router = express.Router()

import getTeams from '../lib/teams_cache'

/**
 * @api {get} /teams List
 * @apiGroup Teams
 * @apiDescription Scrapes the latest team and roster data from Zuluru
 *
 * @apiSuccess (200) {Object} teams key: team value: array of players
 *
 * @apiSuccessExample {json} Example Response:
 *    {
 *      "Kindha's Ongoing Disappointments": {
 *        "players": ["Kevin Hughes", "Jen Cluthe"],
 *        "malePlayers": ["Kevin Hughes"],
 *        "femalePlayers": ["Jen Cluthe"],
 *      },
 *      "Katie Parity": {
 *        "players": ["Dan Thomson", "Andrea Proulx"],
 *        "malePlayers": ["Dan Thomson"],
 *        "femalePlayers": ["Andrea Proulx"],
 *      }
 *    }
 */
router.get('/teams', function (req, res) {
  let teams = getTeams()
  res.json(teams)
})

module.exports = router
