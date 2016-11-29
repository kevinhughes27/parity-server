import fs from 'fs'
import glob from 'glob'
import request from 'request'

import LoopNext from 'loopnext'
let syncLoop = new LoopNext().syncLoop

let url = 'http://localhost:3001/upload'

if (process.argv[2] === 'prod') {
  url = 'https://parity-server.herokuapp.com/upload'
}

glob('test/files/*.json', (err, files) => {
  if (err) console.log(err)

  let iterations = files.length

  syncLoop(iterations, (l) => {
    let idx = l.iteration()
    let file = files[idx]
    let data = JSON.parse(fs.readFileSync(file))

    console.log(`seeding with: ${file}`)

    request.post({url: url, json: true, body: data}, (error) => {
      if (error) console.log(error)
      l.next()
    })
  })
})
