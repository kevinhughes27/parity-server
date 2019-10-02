import _ from 'lodash'
import React, { Component } from 'react'
import PlayerSelect from '../../components/PlayerSelect'
import Chart from './Chart'
import { calcSalaryLimits } from '../../helpers'

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

  applyTrade () {
    const { players, trades, playerA, playerB } = this.state

    const playerAIdx = _.findIndex(players, (p) => p.name === playerA)
    const playerBIdx = _.findIndex(players, (p) => p.name === playerB)

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

    const playerAIdx = _.findIndex(players, (p) => p.name === playerA)
    const playerBIdx = _.findIndex(players, (p) => p.name === playerB)

    const teamA = players[playerAIdx]['team']
    const teamB = players[playerBIdx]['team']

    players[playerAIdx]['team'] = teamB
    players[playerBIdx]['team'] = teamA

    _.remove(trades, (t) => _.isEqual(t, trade))

    this.setState({players: players, trades: trades})
  }

  renderTrades (trades: Array<any>) {
    return _.map(trades, (trade, idx) => {
      return (
        <div className="row" style={{paddingLeft: 10}} key={idx}>
          <div className="col m3">
            <p>{trade.playerA.team}</p>
            <p>{trade.playerA.name}</p>
          </div>

          <div className="col m1">
            <i className="material-icons" style={{paddingTop: 40}}>swap_horiz</i>
          </div>

          <div className="col m3">
            <p>{trade.playerB.team}</p>
            <p>{trade.playerB.name}</p>
          </div>

          <div className="col m1">
            <a href='# ' style={{cursor: 'pointer'}} onClick={() => {this.deleteTrade(trade) }}>
              <i className="material-icons" style={{paddingTop: 40}}>delete</i>
            </a>
          </div>
        </div>
      )
    })
  }

  render () {
    const { players, playerA, playerB, trades } = this.state
    const teamNames = _.sortBy(_.uniq(players.map(p => p.team)));
    const playerNames = players.map(p => p.name)
    const { salaryCap, salaryFloor } = calcSalaryLimits(players);

    return (
      <div>
        <div className="row" style={{paddingTop: 20}}>
          <div className="col m3">
            <PlayerSelect
              value={playerA}
              players={playerNames}
              onChange={(event) => this.playerAChanged(event)}
            />
          </div>
          <div className="col m1 center">
            <i className="material-icons" style={{paddingTop: 10}}>swap_horiz</i>
          </div>
          <div className="col m3">
            <PlayerSelect
              value={playerB}
              players={playerNames}
              onChange={(event) => this.playerBChanged(event)}
            />
          </div>
          <div className="col m1">
            <a href='# ' className="btn" onClick={() => { this.applyTrade() } }>
              Trade
            </a>
          </div>
        </div>

        <div className="row">
          {this.renderTrades(trades)}
        </div>

        <div className="row" style={{paddingTop: 10}}>
          <Chart
            players={players}
            teamNames={teamNames}
            salaryCap={salaryCap}
            salaryFloor={salaryFloor}
          />
        </div>
      </div>
    )
  }
}
