import 'whatwg-fetch'
import _ from 'lodash'
import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import TopNav from '../../layout/TopNav'
import Loading from '../../components/Loading'

export default class GamesList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      games: []
    }
  }

  componentWillMount() {
    fetch('/api/games')
      .then(response => response.json())
      .then(games => { this.setState({loading: false, games: games}) })
  }

  renderGames (games) {
    const gamesByWeek = _.groupBy(games, game => game.week)

    return (
      <div>
        { Object.keys(gamesByWeek).map(week => {
          const games = gamesByWeek[week]
          return this.renderGameGroup(week, games)
        })}
      </div>
    )
  }

  renderGameGroup (week, games) {
    return (
      <div key={week}>
        <h5>Week {week}</h5>
        <ul className='collection'>
          { games.map(this.renderGame) }
        </ul>
      </div>
    )
  }

  renderGame (game) {
    return (
      <Link key={game.id} className='collection-item' to={`/games/${game.id}`}>
        { game.homeTeam } vs { game.awayTeam }
        <span className='secondary-content'>
          { game.homeScore } - { game.awayScore }
        </span>
      </Link>
    )
  }

  renderMain () {
    const { loading, games } = this.state

    if (loading) return (<Loading />)

    return (
      <div className='container'>
        { this.renderGames(games) }
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
