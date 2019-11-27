import React, { Component } from 'react'
import TopNav from '../../layout/TopNav'
import Loading from '../../components/Loading'
import Container from '@material-ui/core/Container'
import Paper from '@material-ui/core/Paper'
import Grid from '@material-ui/core/Grid'
import Typography from '@material-ui/core/Typography';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStar } from '@fortawesome/free-solid-svg-icons'

import Roster from './Roster'
import TeamStats from './TeamStats'
import Points from './Points'
import { fetchGame } from "../../api"

export default class Game extends Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: true,
      game: null
    }
  }

  componentDidMount () {
    const leagueId = this.props.match.params.leagueId
    const gameId = this.props.match.params.gameId

    return (async () => {
      const game = await fetchGame(gameId, leagueId)
      this.setState({game, loading: false})
    })()
  }

  renderMain () {
    const { loading, game } = this.state

    if (loading) return (<Loading />)

    const homeWon = game.homeScore > game.awayScore
    const homeJsx = homeWon
      ? <span><FontAwesomeIcon icon={faStar} /> {game.homeTeam}</span>
      : <span>{game.homeTeam}</span>

    const awayWon = game.awayScore > game.homeScore
    const awayJsx = awayWon
      ? <span><FontAwesomeIcon icon={faStar} /> {game.awayTeam}</span>
      : <span>{game.awayTeam}</span>

    return (
      <Container style={{marginTop: 10}}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Typography variant="h5" gutterBottom={true}>
              {homeJsx}
            </Typography>
            <Paper>
              <Roster players={game.homeRoster} />
            </Paper>
            <TeamStats
              score={game.homeScore}
              winner={game.homeScore > game.awayScore}
              players={game.homeRoster}
              game={game} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="h5" gutterBottom={true}>
              {awayJsx}
            </Typography>
            <Paper>
              <Roster players={game.awayRoster} />
            </Paper>
            <TeamStats
              score={game.awayScore}
              winner={game.awayScore > game.homeScore}
              players={game.awayRoster}
              game={game} />
          </Grid>
        </Grid>
        <Points game={game} />
      </Container>
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
