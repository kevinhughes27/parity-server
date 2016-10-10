import glob from 'glob'

import LoopNext from 'loopnext'
let syncLoop = new LoopNext().syncLoop

import childProcess from 'child_process'
let exec = childProcess.exec

let host = 'http://localhost:3000'
// let host = 'https://parity-server.herokuapp.com'

glob('test/files/*.json', (err, files) => {
  if (err) console.log(err)

  let iterations = files.length

  syncLoop(iterations, (l) => {
    let idx = l.iteration()
    let file = files[idx]

    console.log(`seeding with: ${file}`)

    let cmd = `curl -X POST\
           --data @${file}\
           -H "Content-Type: application/json"\
           ${host}/upload`

    exec(cmd, function (error, stdout, stderr) {
      if (error) console.log(error)
      l.next()
    })
  })
})
