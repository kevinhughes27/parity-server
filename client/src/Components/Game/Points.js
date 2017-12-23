import _ from 'lodash'
import React, { Component } from 'react'
import timediff from 'timediff'
import Event from './Event'

export default class Points extends Component {
  constructor(props) {
    super(props)
    this.renderPoint = this.renderPoint.bind(this)
  }

  componentDidMount () {
    window.$('.collapsible').collapsible()
  }

  render () {
    const game = this.props.game

    return (
      <ul className='collapsible' data-collapsible='expandable'>
        { game.points.map(this.renderPoint) }
      </ul>
    )
  }

  renderPoint (point, idx) {
    const game = this.props.game

    const events = point.events;
    const firstEvent = events[0]
    const lastEvent = _.last(events)
    const secondLastEvent = events[events.length - 2]

    const receiver = lastEvent.firstActor

    const thrower = secondLastEvent.type === 'PASS'
      ? secondLastEvent.firstActor
      : null

    const teamName = _.includes(game.homeRoster, receiver)
      ? game.homeTeam
      : game.awayTeam

    const breakPoint = _.includes(point.defensePlayers, receiver)

    const whatCopy = breakPoint
      ? 'Break Point'
      : 'Point'

    const whoCopy = thrower
      ? `${thrower} to ${receiver}`
      : receiver

    const duration = timediff(firstEvent.timestamp, lastEvent.timestamp, 'mS')
    const durationCopy = `(${duration.minutes}:${duration.seconds} minutes)`

    return (
      <li key={idx}>
        <div className="collapsible-header">
          {whatCopy} <strong>{teamName}</strong> {whoCopy} {durationCopy}
        </div>
        <div className="collapsible-body">
          <ul className="collection" style={{paddingLeft: 40}}>
            { point.events.map((ev, idx) => <Event key={idx} event={ev} />) }
          </ul>
        </div>
      </li>
    )
  }
}
