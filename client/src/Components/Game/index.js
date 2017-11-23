import _ from 'lodash'
import React, { Component } from 'react'
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

  renderMain (game) {
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
          <ul className='collapsible' data-collapsible='expandable'>
            { game.points.map(this.renderPoint) }
          </ul>
        </div>
      </div>
    )
  }

  renderRoster (title, roster) {
    return (
      <div className='col m6'>
        <div className='card-panel' style={{height: 520}}>
          <h5>{title}</h5>
          <table className='highlight'>
            <tbody>
              { _.map(roster, (player) => {
                return (
                  <tr key={player} style={{lineHeight: 0.5}}>
                    <td>{player}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  renderPoint (point, idx) {
    const game = this.state.game
    const player = _.last(point.events).firstActor
    const team = _.includes(game.homeRoster, player) ? game.homeTeam : game.awayTeam

    return (
      <li key={idx}>
        <div className="collapsible-header">
          Point <strong>{team}</strong> by {player}
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
    const { loading, game } = this.state

    if (loading) return (<Loading />)

    return (
      <div>
        <TopNav />
        { this.renderMain(game) }
      </div>
    )
  }
}
