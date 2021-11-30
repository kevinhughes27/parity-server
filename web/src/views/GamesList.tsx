import React, { useState } from 'react'
import makeStyles from '@mui/styles/makeStyles';
import { NavLink } from 'react-router-dom'
import Layout from '../layout/'
import Loading from '../components/Loading'
import LeaguePicker from '../components/LeaguePicker'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction'
import { groupBy } from 'lodash'
import { useLeague } from '../hooks/league'
import { fetchGames, Game } from '../api'

const useStyles = makeStyles((theme) => ({
  list: {
    maxWidth: 800,
    margin: 'auto'
  },
  listItem: {
    color: "#26a69a",
    textDecoration: "none"
  }
}));

function GamesList() {
  const classes = useStyles();
  const [loading, setLoading] = useState(true)
  const [games, setGames] = useState<Game[]>([])
  const [league] = useLeague()

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const games = await fetchGames(league)
      setGames(games)
      setLoading(false)
    }

    fetchData()
  }, [league])

  const renderGames = (games: Game[]) => {
    const gamesByWeek = groupBy(games, game => game.week)
    const weeksInOrder = Object.keys(gamesByWeek).reverse()

    return (
      <React.Fragment>
        { weeksInOrder.map(week => {
          const games = gamesByWeek[week]
          return renderGameGroup(week, games)
        })}
      </React.Fragment>
    )
  }

  const renderGameGroup = (week: string, games: Game[]) => {
    return (
      <React.Fragment key={week}>
        <ListItem divider>
          <ListItemText>
            Week {week}
          </ListItemText>
        </ListItem>
        { games.map(renderGame) }
      </React.Fragment>
    )
  }

  const renderGame = (game: Game) => {
    return (
      <NavLink key={game.id} to={`/${game.league_id}/games/${game.id}`} className={classes.listItem}>
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

  const renderMain = () => {
    if (loading) return (<Loading />)

    return (
      <List className={classes.list}>
        { renderGames(games) }
      </List>
    )
  }

  return (
    <React.Fragment>
      <Layout>
        <LeaguePicker/>
      </Layout>
      { renderMain() }
    </React.Fragment>
  )
}

export default GamesList
