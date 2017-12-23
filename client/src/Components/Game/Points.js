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
    const firstEvent = point.events[0]
    const lastEvent = _.last(point.events)
    const player = lastEvent.firstActor
    const team = _.includes(game.homeRoster, player) ? game.homeTeam : game.awayTeam
    const duration = timediff(firstEvent.timestamp, lastEvent.timestamp, 'mS')

    return (
      <li key={idx}>
        <div className="collapsible-header">
          Point <strong>{team}</strong> by {player} ({duration.minutes}:{duration.seconds} minutes)
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
