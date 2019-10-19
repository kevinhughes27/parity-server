import React, { Component } from 'react'
import { Grid, Container, Button } from '@material-ui/core'
import PlayerSelect from '../../components/PlayerSelect'
import Chart from './Chart'
import { calcSalaryLimits } from '../../helpers'
import { findIndex, sortBy, uniq, remove, isEqual, map } from 'lodash'

export default class TradeSimulator extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loading: true,
      players: this.props.players,
      trades: [],
      playerA: '',
      playerB: '',
    }
  }

  componentDidMount() {
    fetch('/api/players')
      .then(response => response.json())
      .then(players => { this.setState({loading: false, players: players}) })
  }

  playerAChanged (value: string) {
    this.setState({playerA: value})
  }

  playerBChanged (value: string) {
    this.setState({playerB: value})
  }

  applyTrade = () => {
    const { players, trades, playerA, playerB } = this.state

    const playerAIdx = findIndex(players, (p) => p.name === playerA)
    const playerBIdx = findIndex(players, (p) => p.name === playerB)

    const teamA = players[playerAIdx]['team']
    const teamB = players[playerBIdx]['team']

    players[playerAIdx]['team'] = teamB
    players[playerBIdx]['team'] = teamA

    trades.push({
      playerA: {
        name: playerA,
        team: teamA
      },
      playerB: {
        name: playerB,
        team: teamB
      }
    })

    this.setState({players: players, trades: trades})
  }

  deleteTrade (trade) {
    const { players, trades } = this.state
    const playerA = trade.playerA.name
    const playerB = trade.playerB.name

    const playerAIdx = findIndex(players, (p) => p.name === playerA)
    const playerBIdx = findIndex(players, (p) => p.name === playerB)

    const teamA = players[playerAIdx]['team']
    const teamB = players[playerBIdx]['team']

    players[playerAIdx]['team'] = teamB
    players[playerBIdx]['team'] = teamA

    remove(trades, (t) => isEqual(t, trade))

    this.setState({players: players, trades: trades})
  }

  renderTrades (trades: Array<any>) {
    return map(trades, (trade, idx) => {
      return (
        <Grid key={idx} container spacing={3}>
           <Grid item xs={3}>
            <p>{trade.playerA.team}</p>
            <p>{trade.playerA.name}</p>
          </Grid>

           <Grid item xs={1}>
            <i className="material-icons" style={{paddingTop: 40}}>swap_horiz</i>
          </Grid>

           <Grid item xs={3}>
            <p>{trade.playerB.team}</p>
            <p>{trade.playerB.name}</p>
          </Grid>

           <Grid item xs={1}>
            <a href='# ' style={{cursor: 'pointer'}} onClick={() => {this.deleteTrade(trade) }}>
              <i className="material-icons" style={{paddingTop: 40}}>delete</i>
            </a>
          </Grid>
        </Grid>
      )
    })
  }

  render () {
    const { players, playerA, playerB, trades } = this.state
    const teamNames = sortBy(uniq(players.map(p => p.team)));
    const playerNames = players.map(p => p.name)
    const { salaryCap, salaryFloor } = calcSalaryLimits(players);

    return (
      <Container fixed>
        <Grid container spacing={3} justify="flex-start" style={{paddingTop: 14}}>
          <Grid item xs={3}>
            <PlayerSelect
              value={playerA}
              players={playerNames}
              onChange={(event) => this.playerAChanged(event)}
            />
          </Grid>
          <Grid item xs={1}>
            <i className="material-icons" style={{paddingTop: 10}}>swap_horiz</i>
          </Grid>
          <Grid item xs={3}>
            <PlayerSelect
              value={playerB}
              players={playerNames}
              onChange={(event) => this.playerBChanged(event)}
            />
          </Grid>
          <Grid item xs={1}>
            <Button variant="contained" color="secondary" onClick={this.applyTrade}>
              Trade
            </Button>
          </Grid>
        </Grid>

        {this.renderTrades(trades)}

        <div style={{paddingTop: 10}}>
          <Chart
            players={players}
            teamNames={teamNames}
            salaryCap={salaryCap}
            salaryFloor={salaryFloor}
          />
        </div>
      </Container>
    )
  }
}
