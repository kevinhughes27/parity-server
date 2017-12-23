import React, { Component } from 'react'
import TopNav from '../TopNav'
import Loading from '../Loading'

import Roster from './Roster'
import Points from './Points'

export default class Game extends Component {
  constructor(props) {
    super(props)

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
          <Points game={game} />
        </div>
      </div>
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
