// @flow

import _ from 'lodash'
import isEven from 'is-even'

type Event = {
  type: string,
  timestamp: string,
  firstActor: string,
  secondActor: string
}

type Point = {
  offensePlayers: Array<string>,
  defensePlayers: Array<string>,
  events: Array<Event>
}

// function _swapOffenseAndDefense (events, offensePlayers) {
//   // first non pull event
//   let ev = events[0].type === 'PULL' ? events[1] : events[0]
//   return !_.includes(offensePlayers, ev.firstActor)
// }
//
// function _badPassEvent (events) {
//   return _.some(events, (ev) => !ev.firstActor)
// }

let calcStats = function (points: Array<Point>) {
  let stats = {}

  for (let point of points) {
    let { events, offensePlayers, defensePlayers } = point

    // temp fix - O and D players are reversed.
    // if (_swapOffenseAndDefense(events, offensePlayers)) {
    //   console.log(`swap o and d at: ${point.events[0].timestamp}`)
    //   let tmp = offensePlayers
    //   offensePlayers = defensePlayers
    //   defensePlayers = tmp
    // }

    // temp fix - pass event is missing firstActor
    // if (_badPassEvent(events)) {
    //   console.log(`bad pass event at ${point.events[0].timestamp}`)
    //   let idx = _.findIndex(events, (ev) => !ev.firstActor)
    //   let ev = events[idx]
    //   let prevEv = events[idx - 1]
    //
    //   if (ev.secondActor !== prevEv.secondActor) {
    //     prevEv.secondActor = ev.secondActor
    //   }
    //
    //   _.pullAt(events, idx)
    // }

    // process events
    processEvents(events, stats)

    // add player plus minus events
    if (offenseDidScore(events)) {
      _.map(offensePlayers, (name) => { addStat(name, 'OPointsFor', 1, stats) })
      _.map(defensePlayers, (name) => { addStat(name, 'DPointsAgainst', 1, stats) })
    } else {
      _.map(offensePlayers, (name) => { addStat(name, 'OPointsAgainst', 1, stats) })
      _.map(defensePlayers, (name) => { addStat(name, 'DPointsFor', 1, stats) })
    }
  }

  return stats
}

function processEvents (events, stats) {
  let firstEvent = events[0]
  let secondEvent = events[1]

  // handle firstEvent
  if (firstEvent.type === 'PULL') {
    addStat(firstEvent.firstActor, 'Pulls', 1, stats)
    addStat(secondEvent.firstActor, 'Pick-Ups', 1, stats)
  } else {
    addStat(firstEvent.firstActor, 'Pick-Ups', 1, stats)
  }

  events.forEach((ev, idx) => {
    // handle Pick-Ups
    if (isTurnOver(ev)) {
      let nextPlay = events[idx + 1]
      if (nextPlay && nextPlay.type === 'DEFENSE') { nextPlay = events[idx + 2] }
      if (nextPlay && nextPlay.type !== 'POINT') { addStat(nextPlay.firstActor, 'Pick-Ups', 1, stats) }
    }

    switch (ev.type) {
      case 'PASS':
        handlePass(idx, events, stats)
        break
      case 'DROP':
        handleDrop(ev, events[idx - 1], stats)
        break
      case 'THROWAWAY':
        addStat(ev.firstActor, 'Throwaways', 1, stats)
        break
      case 'DEFENSE':
        addStat(ev.firstActor, 'D-Blocks', 1, stats)
        break
      case 'POINT':
        handlePoint(idx, events, stats)
        break
    }
  })
}

function handlePass (idx, events, stats) {
  let ev = events[idx]
  let nextEv = events[idx + 1]

  if (nextEv && passCompleted(nextEv)) {
    addStat(ev.firstActor, 'Completions', 1, stats)
    addStat(ev.secondActor, 'Catches', 1, stats)
  }
}

function handleDrop (ev, prevEv, stats) {
  addStat(ev.firstActor, 'Drops', 1, stats)
  addStat(prevEv.firstActor, 'ThrewDrop', 1, stats)
}

function handlePoint (idx, events, stats) {
  let prevPrevEv = events[idx - 2]
  let prevEv = events[idx - 1]
  let ev = events[idx]

  addStat(ev.firstActor, 'Goals', 1, stats)

  if (prevEv && prevEv.type === 'PASS') {
    addStat(prevEv.firstActor, 'Assists', 1, stats)

    if (prevPrevEv && prevPrevEv.type === 'PASS') {
      addStat(prevPrevEv.firstActor, '2nd Assist', 1, stats)
    }
  } else {
    addStat(ev.firstActor, 'Calihan', 1, stats)
  }
}

// Calihan?

function offenseDidScore (events) {
  let turnOverCount = _.filter(events, isTurnOver).length
  return isEven(turnOverCount)
}

function isTurnOver (ev) {
  return _.includes(['DROP', 'THROWAWAY'], ev.type)
}

function passCompleted (nextEv) {
  return _.includes(['PASS', 'POINT', 'THROWAWAY'], nextEv.type)
}

function addStat (player, statType, number, stats) {
  if (!(player in stats)) {
    stats[player] = initializePlayer()
  }

  stats[player][statType] = stats[player][statType] + number
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
