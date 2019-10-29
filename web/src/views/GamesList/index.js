import _ from 'lodash'
import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import TopNav from '../../layout/TopNav'
import Loading from '../../components/Loading'
import { fetchGames } from "../../api"

export default class GamesList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      games: []
    }
  }

  componentDidMount () {
    (async () => {
      const games = await fetchGames()
      this.setState({games, loading: false})
    })()
  }

  renderGames (games) {
    const gamesByWeek = _.groupBy(games, game => game.week)
    const weeksInOrder = Object.keys(gamesByWeek).reverse()

    return (
      <div>
        { weeksInOrder.map(week => {
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
        { game.homeTeam.name } vs { game.awayTeam.name }
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
