import _ from 'lodash'
import fs from 'fs'
import request from 'request'

let url = 'https://parity-server.herokuapp.com/games'
let week = parseInt(process.argv[2])

request.get(url, (error, response, body) => {
  let games = JSON.parse(body)
  games = _.filter(games, (g) => g.week === week)

  games.forEach((game, idx) => {
    game = _.omit(game, ['stats', '_id'])
    let file = `test/files/week${week}_game${idx + 1}.json`
    fs.writeFileSync(file, JSON.stringify(game, null, 4))
  })
})
