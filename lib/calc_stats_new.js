// @flow

import _ from 'lodash'
import isEven from 'is-even'

let calcStats = function (points: Array<any>) {
  let stats = {}

  for (let point of points) {
    let { events, offensePlayers, defensePlayers } = point

    // temp fix
    if (_swapOffenseAndDefense(events, offensePlayers)) {
      console.log('swap o and d')
      let tmp = offensePlayers
      offensePlayers = defensePlayers
      defensePlayers = tmp
    }

    processEvents(events, stats)

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

function _swapOffenseAndDefense (events, offensePlayers) {
  // first non pull event
  let ev = events[0].type === 'PULL' ? events[1] : events[0]
  return !_.includes(offensePlayers, ev.firstActor)
}

function processEvents (events, stats) {
  events.forEach((ev, idx) => {
    if (idx === 0) handleFirstEvent(ev, events[idx + 1], stats)

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

function handleFirstEvent (ev, nextEv, stats) {
  if (ev.type === 'PULL') {
    addStat(ev.firstActor, 'Pulls', 1, stats)
    addStat(nextEv.firstActor, 'Pick-Ups', 1, stats)
  } else {
    addStat(ev.firstActor, 'Pick-Ups', 1, stats)
  }
}

function handlePass (idx, events, stats) {
  let prevEv = events[idx - 1]
  let ev = events[idx]
  let nextEv = events[idx + 1]

  if (nextEv.type !== 'DROP') {
    addStat(ev.firstActor, 'Completions', 1, stats)
    addStat(ev.secondActor, 'Catches', 1, stats)
  }
  // this might be off since it looks like the order is
  // THROWAWAY then DEFENSE. I us THROWAWAY to mark turns
  // but that means that the prev event is no actually a turnover by
  // my logic (its a DEFENSE)
  // this actually seems kind of wrong though. this won't always be this way
  if (prevEv === undefined || isTurnOver(prevEv)) {
    addStat(ev.firstActor, 'Pick-Ups', 1, stats)
  }
}

// on Drop +1 Drop +1 Throw Drop
// wat - why is this? You shouldn't be penalized by your throw being dropped by default
function handleDrop (ev, prevEv, stats) {
  addStat(ev.firstActor, 'Drops', 1, stats)
  addStat(prevEv.firstActor, 'ThrewDrop', 1, stats)
}

function handlePoint (idx, events, stats) {
  let prevPrevEv = events[idx - 2]
  let prevEv = events[idx - 1]
  let ev = events[idx]

  addStat(ev.firstActor, 'Goals', 1, stats)
  addStat(prevEv.firstActor, 'Assists', 1, stats)

  if (prevPrevEv.type === 'PASS') {
    addStat(prevPrevEv.firstActor, '2nd Assist', 1, stats)
  }

  // addStat(passingEvents[i][5], '3rd Assist', 1, stats)
  // addStat(passingEvents[i][7], '4th Assist', 1, stats)
  // addStat(passingEvents[i][9], '5th Assist', 1, stats)
}

// Calihan?

function offenseDidScore (events) {
  let turnOverCount = _.filter(events, isTurnOver).length
  return isEven(turnOverCount)
}

function isTurnOver (ev) {
  return _.includes(['DROP', 'THROWAWAY'], ev.type)
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
  // player['3rd Assist'] = 0
  // player['4th Assist'] = 0
  // player['5th Assist'] = 0
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
