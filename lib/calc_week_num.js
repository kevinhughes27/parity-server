// @flow

const GAME_DATES = [
  '2017-02-13',
  '2017-02-20',
  '2017-02-27',
  '2017-03-06',
  '2017-03-13',
  '2017-03-20',
  '2017-03-27',
  '2017-04-03',
  '2017-04-10',
  '2017-04-17',
  '2017-04-24',
  '2017-05-01'
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
