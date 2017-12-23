import _ from 'lodash'
import React, { Component } from 'react'
import timediff from 'timediff'
import Event from './Event'

export default class Points extends Component {
  componentDidMount () {
    window.$('.collapsible').collapsible()
  }

  render () {
    const game = this.props.game

    let homeScore = 0
    let awayScore = 0

    return (
      <ul className='collapsible' data-collapsible='expandable'>
        { game.points.map((point, idx) => {
          const result = this.renderPoint(point, homeScore, awayScore, idx)
          homeScore = result.homeScore
          awayScore = result.awayScore
          return result.jsx
        })}
      </ul>
    )
  }

  renderPoint (point, homeScore, awayScore, idx) {
    const game = this.props.game

    const events = point.events;
    const firstEvent = events[0]
    const lastEvent = _.last(events)
    const secondLastEvent = events[events.length - 2]

    const receiver = lastEvent.firstActor

    const thrower = secondLastEvent.type === 'PASS'
      ? secondLastEvent.firstActor
      : null

    const homeScored = _.includes(game.homeRoster, receiver)
    const teamName = homeScored
      ? game.homeTeam
      : game.awayTeam

    const homeColor = '#98abc5'
    const awayColor = '#ff8c00'
    const teamColor = homeScored
      ? homeColor
      : awayColor

    const teamJsx = <strong style={{color: teamColor}}>{teamName}</strong>

    const breakPoint = _.includes(point.defensePlayers, receiver)

    const whatCopy = breakPoint
      ? 'Break Point'
      : 'Point'

    const iconJsx = breakPoint
      ? (<i className="fa fa-bolt" style={{marginRight: 0}}/>)
      : null

    const whoCopy = thrower
      ? `${thrower} to ${receiver}`
      : receiver

    const duration = timediff(firstEvent.timestamp, lastEvent.timestamp, 'mS')
    const durationCopy = `(${duration.minutes}:${duration.seconds} minutes)`

    if (homeScored) {
      homeScore = homeScore + 1
    } else {
      awayScore = awayScore + 1
    }

    const scoreCopy = `${homeScore} - ${awayScore}`

    const pointsJsx = (
      <li key={idx}>
        <div className="collapsible-header">
          <div style={{display: 'flex', flex: 1, justifyContent: 'space-between'}}>
            <span>{iconJsx} {whatCopy} {teamJsx} {whoCopy} {durationCopy}</span>
            <span>{scoreCopy}</span>
          </div>
        </div>
        <div className="collapsible-body">
          <ul className="collection" style={{paddingLeft: 40}}>
            { point.events.map((ev, idx) => <Event key={idx} event={ev} />) }
          </ul>
        </div>
      </li>
    )

    return {
      homeScore,
      awayScore,
      jsx: pointsJsx
    }
  }
}
