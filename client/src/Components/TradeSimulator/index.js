// @flow

import _ from 'lodash'
import React, { Component } from 'react'
import PlayerSelect from '../PlayerSelect'
import TopNav from '../TopNav'
import Loading from '../Loading'
import { Bar } from 'react-chartjs-2'
import { colors, warnColors } from '../gradients'
import 'chartjs-plugin-annotation'

export default class TradeSimulator extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loading: true,
      players: [],
      trades: [],
      playerA: '',
      playerB: '',
    }
  }

  componentWillMount() {
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
    let { playerA, playerB, stats, trades } = this.state
    let teamA = stats.forPlayer(playerA)['Team']
    let teamB = stats.forPlayer(playerB)['Team']

    // stats.applyTrade(playerA, playerB)
    // applyTrade (playerA: string, playerB: string) {
    //   let teamA = this.data[playerA]['team']
    //   let teamB = this.data[playerB]['team']
    //
    //   this.data[playerA]['team'] = teamB
    //   this.data[playerB]['team'] = teamA
    // }

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
    const players = this.state.players;
    const teamNames = _.uniq(players.map(p => p.team));
    const salaryCap = _.sum(_.map(players, (p) => p.salary)) / 8 * 1.01

    const data = {
      labels: teamNames,
      datasets: _.flatten(teamNames.map(team => {
        const teamPlayers = _.sortBy(players.filter((p) => p.team === team), (p) => p.salary)
        return teamPlayers.map((player, idx) => {
          const teamSalary = _.sum(_.map(teamPlayers, (p) => p.salary))
          const overCap = teamSalary > salaryCap

          return {
            type: 'bar',
            label: player.name,
            stack: team,
            data: [player.salary],
            backgroundColor: overCap ? warnColors[idx] : colors[idx],
            hoverBackgroundColor: overCap ? warnColors[idx] : colors[idx]
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
          value: salaryCap,
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

  renderMain () {
    const { players, playerA, playerB, trades } = this.state
    const playerNames = players.map(p => p.name)

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

  render () {
    const loading = this.state.loading

    if (loading) return (<Loading />)

    return (
      <div>
        <TopNav />
        <div className='container'>
          { this.renderMain() }
        </div>
      </div>
    )
  }
}
