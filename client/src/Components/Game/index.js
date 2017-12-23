import React, { Component } from 'react'
import TopNav from '../TopNav'
import Loading from '../Loading'

import Team from './Team'
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
        <div className='row'>
          <div className='col s6'>
            <Team
              team={game.homeTeam}
              score={game.homeScore}
              winner={game.homeScore > game.awayScore}
              players={game.homeRoster}
              game={game} />
          </div>
          <div className='col s6'>
            <Team
              team={game.awayTeam}
              score={game.awayScore}
              winner={game.awayScore > game.homeScore}
              players={game.awayRoster}
              game={game} />
          </div>
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
