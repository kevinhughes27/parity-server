import React, { Component } from 'react'
import { withStyles } from '@material-ui/styles'
import { NavLink } from 'react-router-dom'
import TopNav from '../../layout/TopNav'
import Loading from '../../components/Loading'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction'
import { groupBy } from 'lodash'
import 'whatwg-fetch'

const styles = {
  list: {
    maxWidth: 800,
    margin: 'auto'
  }
}

class GamesList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      games: []
    }
  }

  componentDidMount() {
    fetch('/api/games')
      .then(response => response.json())
      .then(games => { this.setState({loading: false, games: games}) })
  }

  renderGames (games) {
    const gamesByWeek = groupBy(games, game => game.week)

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
      <>
        <ListItem>
          <ListItemText>
            Week {week}
          </ListItemText>
        </ListItem>
        { games.map(this.renderGame) }
      </>
    )
  }

  renderGame (game) {
    return (
      <NavLink key={game.id} to={`/games/${game.id}`}>
        <ListItem button>
          <ListItemText>
            { game.homeTeam } vs { game.awayTeam }
            <ListItemSecondaryAction>
              { game.homeScore } - { game.awayScore }
            </ListItemSecondaryAction>
          </ListItemText>
        </ListItem>
      </NavLink>
    )
  }

  renderMain () {
    const { classes } = this.props
    const { loading, games } = this.state

    if (loading) return (<Loading />)

    return (
      <List className={classes.list}>
        { this.renderGames(games) }
      </List>
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

export default withStyles(styles)(GamesList)
