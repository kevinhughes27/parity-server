import _ from 'lodash'
import fs from 'fs'
import request from 'request'
import zeroPad from 'zero-pad'

let url = 'https://parity-server.herokuapp.com/games'
let week = parseInt(process.argv[2])

request.get(url, (error, response, body) => {
  let games = JSON.parse(body)
  games = _.filter(games, (g) => g.week === week)

  games.forEach((game, idx) => {
    game = _.omit(game, ['stats', '_id'])
    let weekNum = zeroPad(week)
    let gameNum = idx + 1
    let file = `db/week${weekNum}_game${gameNum}.json`
    fs.writeFileSync(file, JSON.stringify(game, null, 4))
  })
})
