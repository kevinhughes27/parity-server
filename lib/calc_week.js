// @flow

import _ from 'lodash'

console.log(process.env.MONGODB_URI) // undefined
const Db = require('monk')(process.env.MONGODB_URI)
const Games = Db.get('games')

let calcWeek = async function (weekNum: number) {
  if (weekNum === 0) return

  let docs = await fetchGames(weekNum)
  let stats = mergeGames({}, docs)

  return {
    week: weekNum,
    stats: stats
  }
}

let fetchGames = async function (weekNum) {
  let docs = await Games.find({week: weekNum}, {})
  return docs
}

let mergeGames = function (stats, games) {
  _.each(games, (g) => {
    _.merge(stats, g.stats)
  })

  return stats
}

module.exports = calcWeek
