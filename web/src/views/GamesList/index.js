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
import { fetchGames } from '../../api'

const styles = {
  list: {
    maxWidth: 800,
    margin: 'auto'
  },
  listItem: {
    color: "#26a69a",
    textDecoration: "none"
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

  componentDidMount () {
    (async () => {
      const games = await fetchGames()
      this.setState({games, loading: false})
    })()
  }

  renderGames (games) {
    const gamesByWeek = groupBy(games, game => game.week)
    const weeksInOrder = Object.keys(gamesByWeek).reverse()

    return (
      <React.Fragment>
        { weeksInOrder.map(week => {
          const games = gamesByWeek[week]
          return this.renderGameGroup(week, games)
        })}
      </React.Fragment>
    )
  }

  renderGameGroup (week, games) {
    return (
      <React.Fragment key={week}>
        <ListItem divider>
          <ListItemText>
            Week {week}
          </ListItemText>
        </ListItem>
        { games.map(this.renderGame) }
      </React.Fragment>
    )
  }

  renderGame (game) {
    return (
      <NavLink key={game.id} to={`/games/${game.id}`} style={styles.listItem}>
        <ListItem divider button>
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
      <React.Fragment>
        <TopNav />
        { this.renderMain() }
      </React.Fragment>
    )
  }
}

export default withStyles(styles)(GamesList)
