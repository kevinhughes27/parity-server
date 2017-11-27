import _ from 'lodash'
import React, { Component } from 'react'
import timediff from 'timediff'
import TopNav from '../TopNav'
import Loading from '../Loading'

export default class Game extends Component {
  constructor(props) {
    super(props)

    this.renderPoint = this.renderPoint.bind(this)

    this.state = {
      loading: true,
      game: null
    }
  }

  componentWillMount() {
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
          { this.renderRoster('Home', game.homeRoster) }
          { this.renderRoster('Away', game.awayRoster) }
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

  renderRoster (title, roster) {
    return (
      <div className='col s6'>
        <h5>{title}</h5>
        <ul className='collection'>
          { _.map(roster, (player) => {
            return (
              <li className='collection-item' key={player}>
                {player}
              </li>
            )
          })}
        </ul>
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
            { point.events.map(this.renderEvent) }
          </ul>
        </div>
      </li>
    )
  }

  renderEvent (event, idx) {
    if (event.type === 'PULL') {
      return (
        <li key={idx} className="collection-item">
          {event.firstActor} pulled
        </li>
      )
    }

    if (event.type === 'PASS') {
      return (
        <li key={idx} className="collection-item">
          {event.firstActor} passed to {event.secondActor}
        </li>
      )
    }

    if (event.type === 'POINT') {
      return (
        <li key={idx} className="collection-item">
          {event.firstActor} scored!
        </li>
      )
    }

    if (event.type === 'DEFENSE') {
      return (
        <li key={idx} className="collection-item">
          {event.firstActor} got a block
        </li>
      )
    }

    if (event.type === 'THROWAWAY') {
      return (
        <li key={idx} className="collection-item">
          {event.firstActor} threw it away
        </li>
      )
    }

    if (event.type === 'DROP') {
      return (
        <li key={idx} className="collection-item">
          {event.firstActor} dropped it
        </li>
      )
    }
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
