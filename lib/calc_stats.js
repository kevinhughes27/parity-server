// @flow

import _ from 'lodash'

let calcStats = function (events: Array<any>) {
  let stats = {}

  let groupedEvents = groupEvents(events)
  let switchingDirectionEvents = groupedEvents.switchingDirectionEvents
  let endOfDirectionEvents = groupedEvents.endOfDirectionEvents
  let passingEvents = groupedEvents.passingEvents
  let onFieldEvents = groupedEvents.onFieldEvents

  processSwitchingDirectionEvents(switchingDirectionEvents, stats)
  processEndOfDirectionEvents(endOfDirectionEvents, passingEvents, stats)
  processPassingEvents(passingEvents, stats)
  processOnFieldEvents(onFieldEvents, stats)

  return stats
}

function processSwitchingDirectionEvents (events, stats) {
  events.forEach((ev) => {
    switch (ev[0]) {

      case 'Pull':
        addEvent(ev[1], 'Pulls', 1, stats)
        break

      case 'D':
        addEvent(ev[1], 'D-Blocks', 1, stats)
        break
    }
  })
}

function processEndOfDirectionEvents (endOfDirectionEvents, passingEvents, stats) {
  endOfDirectionEvents.forEach((ev, i) => {
    switch (endOfDirectionEvents[i][0]) {

      // on point +1 POINT +1 Catch +1 Assist +1 Throw +1 2nd-5th Assist +1 possible Calihan
      case 'POINT':
        addEvent(endOfDirectionEvents[i][1], 'Goals', 1, stats)

        if (blank(passingEvents[i][1])) {
          addEvent(endOfDirectionEvents[i][1], 'Calihan', 1, stats)
        } else {
          addEvent(passingEvents[i][1], 'Assists', 1, stats)
          addEvent(passingEvents[i][1], 'Completions', 1, stats)
          addEvent(endOfDirectionEvents[i][1], 'Catches', 1, stats)
        }

        addEvent(passingEvents[i][3], '2nd Assist', 1, stats)
        break

      // on Throw Away +1 Throw Away +1 Catch
      case 'Throw Away':
        addEvent(endOfDirectionEvents[i][1], 'Throwaways', 1, stats)

        if (blank(passingEvents[i][1])) {
          addEvent(endOfDirectionEvents[i][1], 'Pick-Ups', 1, stats)
        } else {
          addEvent(endOfDirectionEvents[i][1], 'Catches', 1, stats)
          addEvent(passingEvents[i][1], 'Completions', 1, stats)
        }
        break

      // on Drop +1 Drop +1 Throw Drop
      case 'Drop':
        addEvent(endOfDirectionEvents[i][1], 'Drops', 1, stats)
        addEvent(passingEvents[i][1], 'ThrewDrop', 1, stats)
        break
    }
  })
}

function processPassingEvents (events, stats) {
  events.forEach((ev) => {
    for (let j = 0; j < ev.length; j += 2) {
      if (ev[j] !== 'Pass') continue

      if (blank(ev[j + 2])) {
        addEvent(ev[j + 1], 'Pick-Ups', 1, stats)
      } else {
        addEvent(ev[j + 1], 'Catches', 1, stats)
        addEvent(ev[j + 3], 'Completions', 1, stats)
      }
    }
  })
}

function processOnFieldEvents (events, stats) {
  events.forEach((ev) => {
    switch (ev[0]) {

      // Points for and Against
      case 'O+':
        addEvent(ev[1], 'OPointsFor', 1, stats)
        break

      case 'O-':
        addEvent(ev[1], 'OPointsAgainst', 1, stats)
        break

      case 'D+':
        addEvent(ev[1], 'DPointsFor', 1, stats)
        break

      case 'D-':
        addEvent(ev[1], 'DPointsAgainst', 1, stats)
        break
    }
  })
}

function groupEvents (events) {
  let switchingDirectionEvents = []
  let endOfDirectionEvents = []
  let passingEvents = []
  let onFieldEvents = []

  let isDirectionLeft
  let isLastPointLeft

  events.forEach(function (e, idx) {
    e = prepareEvent(e)

    if (e[0] === 'Pull') {
      switchingDirectionEvents.push(e)
      let nextEv = prepareEvent(events[idx + 1])
      isLastPointLeft = isLeft(nextEv[1])
    } else if (e[0] === 'D') {
      switchingDirectionEvents.push(e)
    } else if (isEndOfDirectionEvent(e[0])) {
      endOfDirectionEvents.push(e.slice(0, 2))
      passingEvents.push(e.slice(2, e.length))
    } else if (e[0] === 'POINT') {
      endOfDirectionEvents.push([e[0], e[1], isLastPointLeft])
      passingEvents.push(e.slice(2, e.length))
      isLastPointLeft = !isDirectionLeft
    } else if (isOnFieldEvent(e[0])) {
      onFieldEvents.push(e)
    } else if (e[0] === 'Direction') {
      isDirectionLeft = isLeft(e[1])
    }
  })

  let pointEvents = _.filter(endOfDirectionEvents, (e) => { return e[0] === 'POINT' })
  let numPoints = pointEvents.length
  let numPlayersOnField = onFieldEvents.length / numPoints

  pointEvents.forEach(function (e, i) {
    let offset = numPlayersOnField
    let start = i * offset
    let middle = i * offset + offset / 2
    let end = i * offset + offset

    let leftTeam = _.slice(onFieldEvents.slice(start, middle))
    let rightTeam = _.slice(onFieldEvents.slice(middle, end))

    let isLastPointLeft = e[2]

    leftTeam.forEach(function (e) {
      if (isLastPointLeft) {
        e[0] = 'O' + e[0][0]
      } else {
        e[0] = 'D' + e[0][0]
      }
    })

    rightTeam.forEach(function (e) {
      if (isLastPointLeft) {
        e[0] = 'D' + e[0][0]
      } else {
        e[0] = 'O' + e[0][0]
      }
    })
  })

  return {
    switchingDirectionEvents: switchingDirectionEvents,
    endOfDirectionEvents: endOfDirectionEvents,
    passingEvents: passingEvents,
    onFieldEvents: onFieldEvents
  }
}

function isLeft (token) {
  return token === '>>>>>>'
}

function isEndOfDirectionEvent (token) {
  return token === 'Drop' ||
         token === 'Throw Away'
}

function isOnFieldEvent (token) {
  return token === '+1' ||
         token === '-1'
}

function prepareEvent (e) {
  e = e.trim()
  e = e.split(',')
  return e
}

function blank (value) {
  return value === '' || value === undefined
}

function addEvent (player, event, number, stats) {
  if (blank(player)) return

  if (!(player in stats)) {
    stats[player] = initializePlayer()
  }

  stats[player][event] = stats[player][event] + number
}

function initializePlayer () {
  let player = {}

  player['Goals'] = 0
  player['Assists'] = 0
  player['2nd Assist'] = 0
  player['D-Blocks'] = 0
  player['Completions'] = 0
  player['Throwaways'] = 0
  player['ThrewDrop'] = 0
  player['Catches'] = 0
  player['Drops'] = 0
  player['Pick-Ups'] = 0
  player['Pulls'] = 0
  player['Calihan'] = 0
  player['OPointsFor'] = 0
  player['OPointsAgainst'] = 0
  player['DPointsFor'] = 0
  player['DPointsAgainst'] = 0

  return player
}

module.exports = calcStats
