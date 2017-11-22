// @flow

import _ from 'lodash'
import React, { Component } from 'react'
import Stats from '../../Stores/Stats'
import PlayerSelect from '../PlayerSelect'
import { Bar } from 'react-chartjs-2'
import 'chartjs-plugin-annotation'

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
  state: {
    week: number,
    stats: Stats,
    playerA: string,
    playerB: string,
    trades: Array<Trade>
  }

  constructor (props: Props) {
    super(props)

    const { week, stats } = this.props
    const players = stats.playerNames()

    this.state = {
      week: week,
      stats: stats,
      playerA: players[0],
      playerB: players[1],
      trades: []
    }
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
            <a style={{cursor: 'pointer'}} onClick={() => {this.deleteTrade(trade) }}>
              <i className="material-icons" style={{paddingTop: 40}}>delete</i>
            </a>
          </div>
        </div>
      )
    })
  }

  renderGraph () {
    const stats = this.state.stats
    const teamNames = stats.teamNames()

    const colors = [
      '#E5F5E0',
      '#D7EDD4',
      '#C9E5C9',
      '#BBDEBE',
      '#ADD6B3',
      '#9FCFA8',
      '#91C79D',
      '#84C092',
      '#76B887',
      '#68B07C',
      '#5AA971',
      '#4CA166',
      '#3E9A5B',
      '#309250',
      '#238B45'
    ]

    const data = {
      labels: teamNames,
      datasets: _.flatten(teamNames.map(team => {
        return stats.playersFor(team).map((player, idx) => {
          return {
            type: 'bar',
            label: player.name,
            stack: team,
            data: [player.salary],
            backgroundColor: colors[idx],
            hoverBackgroundColor: colors[idx]
          }
        })
      }))
    }

    const options = {
      legend: {
        display: false
      },
      tooltips: {
        callbacks: {
          title: (tooltipItem, data) => {
            const item = data.datasets[tooltipItem[0].datasetIndex]
            return item.stack
          }
        }
      },
      scales: {
        xAxes: [{
          barPercentage: 0.6,
          categoryPercentage: 1.0,
          ticks: {
            autoSkip: false
          }
        }],
        yAxes: [{
          stacked: true
        }]
      },
      animation: {
        duration: 0
      },
      annotation: {
        annotations: [{
          type: 'line',
          mode: 'horizontal',
          scaleID: 'y-axis-0',
          value: stats.salaryCap(),
          borderColor: 'black',
          borderWidth: 2,
          label: {
            position: 'right',
            backgroundColor: 'black',
            content: 'Salary Cap',
            enabled: true
          }
        }]
      }
    }

    return <Bar data={data} redraw={true} options={options}/>
  }

  render () {
    const { stats, playerA, playerB, trades } = this.state
    const playerNames = stats.playerNames()

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
          { this.renderGraph() }
        </div>
      </div>
    )
  }
}
