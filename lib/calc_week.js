// @flow

import _ from 'lodash'

const db = require('monk')(process.env.MONGODB_URI)
const games = db.get('games')

let calcWeek = async function (weekNum: number) {
  let stats = {}

  let docs = await fetchGames(weekNum)
  _.each(docs, (g) => {
    _.merge(stats, g.stats)
  })

  return {
    week: weekNum,
    stats: stats
  }
}

let fetchGames = async function (weekNum) {
  let docs = await games.find({week: weekNum}, {})
  return docs
}

module.exports = calcWeek
