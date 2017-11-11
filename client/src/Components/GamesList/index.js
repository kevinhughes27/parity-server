import 'whatwg-fetch'
import _ from 'lodash'
import React, { Component } from 'react'
import TopNav from '../TopNav'
import Loading from '../Loading'

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
          { games.map(game =>
            <li key={game.id} className='collection-item'>
              { game.homeTeam } vs {game.awayTeam}
            </li>
          )}
        </ul>
      </div>
    )
  }

  renderMain () {
    const { loading, games } = this.state

    if (loading) return (<Loading />)

    return (
      <div className="container">
        { this.renderGames(games) }
      </div>
    )
  }

  render () {
    return (
      <div>
        <TopNav/>
        { this.renderMain() }
      </div>
    )
  }
}
