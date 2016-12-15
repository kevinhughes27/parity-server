// @flow

import express from 'express'
let router = express.Router()

import NodeCache from 'node-cache'
const cache = new NodeCache()
const key = 'teams'

const ttl = 60 * 90 // 1.5 hours in seconds
const refreshFreq = 60 * 60 * 1000 // 1 hour in milliseconds

import fetchTeams from '../lib/fetch_teams'

let cacheTeams = async function () {
  console.log('[TeamsCache] starting refresh...')
  let teams = await fetchTeams()
  cache.set(key, teams, ttl)
  console.log('[TeamsCache] finished')
}

cacheTeams() // cache on boot
setInterval(cacheTeams, refreshFreq)

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
  cache.get(key, function (err, value) {
    if (!err) {
      res.json(value)
    }
  })
})

module.exports = router
