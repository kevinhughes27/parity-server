// @flow

import _ from 'lodash'
import React, { Component } from 'react'
import Stats from '../../Stores/Stats'
import PlayerSelect from '../PlayerSelect'
import LeagueGraph from './LeagueGraph'

type Props = {
  week: number,
  stats: Stats
}

type Trade = {
  playerA: {
    name: string,
    team: string,
  },
  playerB: {
    name: string,
    team: string
  }
}

export default class TradeSimulator extends Component {
  props: Props
  graph: LeagueGraph
  node: Node
  state: {
    week: number,
    stats: Stats,
    playerA: string,
    playerB: string,
    trades: Array<Trade>
  }

  constructor (props: Props) {
    super(props)

    let players = this.props.stats.playerNames()

    this.state = {
      week: this.props.week,
      stats: this.props.stats,
      playerA: players[0],
      playerB: players[1],
      trades: []
    }
  }

  componentDidMount () {
    this.renderD3()
  }

  componentDidUpdate () {
    this.updateD3()
  }

  renderD3 () {
    let stats = this.state.stats

    this.graph = new LeagueGraph()
    this.graph.init(this.node)
    this.graph.create(stats.teamNames(), stats, stats.salaryCap(), stats.salaryFloor())
  }

  updateD3 () {
    let stats = this.state.stats
    this.graph.update(stats.teamNames(), stats, stats.salaryCap())
  }

  playerAChanged (value: string) {
    this.setState({playerA: value})
  }

  playerBChanged (value: string) {
    this.setState({playerB: value})
  }

  applyTrade () {
    let { playerA, playerB, stats, trades } = this.state
    let teamA = stats.forPlayer(playerA)['Team']
    let teamB = stats.forPlayer(playerB)['Team']

    stats.applyTrade(playerA, playerB)

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

    this.setState({stats: stats, trades: trades})
  }

  deleteTrade (trade: Trade) {
    let { stats, trades } = this.state
    let playerA = trade.playerA.name
    let playerB = trade.playerB.name

    stats.applyTrade(playerB, playerA)
    _.remove(trades, (t) => _.isEqual(t, trade))

    this.setState({stats: stats, trades: trades})
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
            <a href='#' onClick={() => { this.deleteTrade(trade) } }>
              <i className="material-icons" style={{paddingTop: 40}}>delete</i>
            </a>
          </div>
        </div>
      )
    })
  }

  render () {
    let playerNames = this.state.stats.playerNames()
    let { playerA, playerB, trades } = this.state

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
            <a className="btn" onClick={() => { this.applyTrade() } }>
              Trade
            </a>
          </div>
        </div>

        <div className="row">
          {this.renderTrades(trades)}
        </div>

        <div className="row" style={{paddingTop: 10}}>
          <div id="chart" ref={(node) => { this.node = node }}></div>
        </div>
      </div>
    )
  }
}
