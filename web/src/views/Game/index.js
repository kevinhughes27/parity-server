import React, { Component } from 'react'
import TopNav from '../../layout/TopNav'
import Loading from '../../components/Loading'

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

  componentDidMount () {
    const gameId = this.props.match.params.gameId

    fetch(`/api/games/${gameId}`)
      .then(response => response.json())
      .then(game => { this.setState({loading: false, game: game}) })
  }

  renderMain () {
    const { loading, game } = this.state

    if (loading) return (<Loading />)

    const homeWon = game.homeScore > game.awayScore
    const homeJsx = homeWon
      ? <h5><i className="fa fa-star" /> {game.homeTeam}</h5>
      : <h5>{game.homeTeam}</h5>

    const awayWon = game.awayScore > game.homeScore
    const awayJsx = awayWon
      ? <h5><i className="fa fa-star" /> {game.awayTeam}</h5>
      : <h5>{game.awayTeam}</h5>

    return (
      <div className='container'>
        <div className='row'>
          <div className='col s6'>
            {homeJsx}
          </div>
          <div className='col s6'>
            {awayJsx}
          </div>
        </div>
        <div className='row'>
          <div className='col s6'>
            <Team
              score={game.homeScore}
              winner={game.homeScore > game.awayScore}
              players={game.homeRoster}
              game={game} />
          </div>
          <div className='col s6'>
            <Team
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
