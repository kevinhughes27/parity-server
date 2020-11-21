import React, { useState } from 'react'
import Layout from '../../layout/'
import Loading from '../../components/Loading'
import Container from '@material-ui/core/Container'
import Grid from '@material-ui/core/Grid'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStar } from '@fortawesome/free-solid-svg-icons'

import Team from './Team'
import Points from './Points'
import { fetchGame } from "../../api"
import { homeColors, awayColors } from '../../helpers'
import { pickBy, includes, forIn } from 'lodash'

export default function Game(props) {
  const leagueId = props.match.params.leagueId
  const gameId = props.match.params.gameId

  const [loading, setLoading] = useState(true)
  const [game, setGame] = useState(null)

  React.useEffect(async () => {
    setLoading(true)
    const game = await fetchGame(gameId, leagueId)
    setGame(game)
    setLoading(false)
  }, [leagueId, gameId])

  const Main = () => {
    if (loading) return (<Loading />)

    const homeWon = game.homeScore > game.awayScore
    const homeJsx = homeWon
      ? <span><FontAwesomeIcon icon={faStar} /> {game.homeTeam}</span>
      : <span>{game.homeTeam}</span>

    const awayWon = game.awayScore > game.homeScore
    const awayJsx = awayWon
      ? <span><FontAwesomeIcon icon={faStar} /> {game.awayTeam}</span>
      : <span>{game.awayTeam}</span>

    const homeStats = pickBy(game.stats, (_stat, player) => includes(game.homeRoster, player))
    const awayStats = pickBy(game.stats, (_stat, player) => includes(game.awayRoster, player))

    const statMaxes = {}
    forIn(game.stats, (stats) => {
      forIn(stats, (value, key) => {
        const max = Math.max(value, statMaxes[key] || 0)
        statMaxes[key] = max
      })
    })

    return (
      <Container style={{marginTop: 20}}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Team
              teamName={homeJsx}
              score={game.homeScore}
              players={game.homeRoster}
              points={game.points}
              stats={homeStats}
              colors={homeColors}
              statMaxes={statMaxes}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Team
              teamName={awayJsx}
              score={game.awayScore}
              players={game.awayRoster}
              points={game.points}
              stats={awayStats}
              colors={awayColors}
              statMaxes={statMaxes}
            />
          </Grid>
        </Grid>
        <Points game={game} />
      </Container>
    )
  }

  return (
    <React.Fragment>
      <Layout />
      <Main />
    </React.Fragment>
  )
}
