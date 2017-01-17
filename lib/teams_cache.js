// @flow

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

// cache on boot
  cacheTeams()
  setInterval(cacheTeams, refreshFreq)
  
let getTeams = function () {
  return cache.get(key)
}

module.exports = getTeams
