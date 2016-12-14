import _ from 'lodash'
import fs from 'fs'
import 'colour'

// usage
// ./node_modules/babel-cli/bin/babel-node.js bin/compare.js oldStats.json newStats.json

let oldStats = JSON.parse(fs.readFileSync(process.argv[2])).stats
let newStats = JSON.parse(fs.readFileSync(process.argv[3])).stats

_.mapKeys(oldStats, (playerStats, playerName) => {
  if (_.includes(playerName, '(S)')) return

  let oldSalary = playerStats['Salary']
  let newSalary = newStats[playerName]['Salary']
  let diff = newSalary - oldSalary
  let percentChange = Math.abs(diff) / oldSalary

  // greater than 5% change
  if (percentChange > 0.05) {
    if (diff > 0) {
      console.log(`${playerName} ${oldSalary} ^^^ ${newSalary}`.green)
    } else {
      console.log(`${playerName} ${oldSalary} vvv ${newSalary}`.red)
    }
  }
})
