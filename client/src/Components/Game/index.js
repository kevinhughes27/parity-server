import _ from 'lodash'
import React, { Component } from 'react'
import timediff from 'timediff'
import TopNav from '../TopNav'
import Loading from '../Loading'

import Roster from './Roster'
import Event from './Event'

export default class Game extends Component {
  constructor(props) {
    super(props)

    this.renderPoint = this.renderPoint.bind(this)

    this.state = {
      loading: true,
      game: null
    }
  }

  componentWillMount () {
    const gameId = this.props.params.gameId

    fetch(`/api/games/${gameId}`)
      .then(response => response.json())
      .then(game => { this.setState({loading: false, game: game}) })
  }

  componentDidUpdate () {
    window.$('.collapsible').collapsible()
  }

  renderMain () {
    const { loading, game } = this.state

    if (loading) return (<Loading />)

    return (
      <div className='container'>
        <div className='center-align'>
          <h5>{ game.homeTeam } vs { game.awayTeam }</h5>
          <h5><strong>{ game.homeScore } - { game.awayScore }</strong></h5>
        </div>
        <div className='row'>
          <Roster title={'Home'} players={game.homeRoster} />
          <Roster title={'Away'} players={game.awayRoster} />
        </div>
        <div className='row'>
          <h5>Points</h5>
          <ul className='collapsible' data-collapsible='expandable'>
            { game.points.map(this.renderPoint) }
          </ul>
        </div>
      </div>
    )
  }

  renderPoint (point, idx) {
    const game = this.state.game
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

  render () {
    return (
      <div>
        <TopNav />
        { this.renderMain() }
      </div>
    )
  }
}
