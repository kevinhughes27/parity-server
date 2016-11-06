// @flow

const GAME_DATES = [
  '2016-11-07',
  '2016-11-14',
  '2016-11-21',
  '2016-11-28',
  '2016-12-05',
  '2016-12-12',
  '2016-12-19',
  '2017-01-09',
  '2017-01-16'
]

let calcWeekNum = function (date: Date) {
  let weekNum = 0

  for (let gameDate of GAME_DATES) {
    if (pastWeek(date, gameDate)) { weekNum = weekNum + 1 }
  }

  return weekNum
}

let pastWeek = function (date, gameDate) {
  return date >= new Date(gameDate)
}

module.exports = calcWeekNum
