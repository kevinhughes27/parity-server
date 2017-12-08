// @flow

import _ from 'lodash'
import ls from 'local-storage'
import React, { Component } from 'react'
import Stats from '../../Stores/Stats'
import PlayerSelect from '../PlayerSelect'
import { Bar } from 'react-chartjs-2'

const STATS = [
  'goals',
  'assists',
  'second_assists',
  'd_blocks',
  'catches',
  'completions',
  'throw_aways',
  'threw_drops',
  'drops'
]

type Props = {
  week: number,
  stats: Stats
}

export default class ComparePlayers extends Component {
  props: Props
  state: {
    week: number,
    stats: Stats,
    playerAName: string,
    playerBName: string,
  }

  constructor (props: Props) {
    super(props)

    let players = this.props.stats.playerNames()

    this.state = {
      week: this.props.week,
      stats: this.props.stats,
      playerAName: ls.get('playerA') || players[0],
      playerBName: ls.get('playerB') || players[1]
    }
  }

  playerAChanged (value: string) {
    ls.set('playerA', value)
    this.setState({playerAName: value})
  }

  playerBChanged (value: string) {
    ls.set('playerB', value)
    this.setState({playerBName: value})
  }

  renderGraph () {
    const { stats, playerAName, playerBName } = this.state
    const playerAStats = _.pick(stats.forPlayer(playerAName), STATS)
    const playerBStats = _.pick(stats.forPlayer(playerBName), STATS)

    const data = {
      labels: STATS,
      datasets: [
        {
          label: playerAName,
          data: Object.values(playerAStats),
          backgroundColor: '#98abc5'
        },
        {
          label: playerBName,
          data: Object.values(playerBStats),
          backgroundColor: '#ff8c00'
        }
      ]
    }

    const options = {
      legend: {
        display: false
      }
    }

    return <Bar data={data} redraw={true} options={options}/>
  }

  render () {
    const { stats, playerAName, playerBName } = this.state
    const playerNames = stats.playerNames()

    return (
      <div>
        <div style={{paddingTop: '20px'}}>
          { this.renderGraph() }
        </div>
        <div className="row">
          <div className="col m2 s4">
            <PlayerSelect
              value={playerAName}
              players={playerNames}
              onChange={(event) => this.playerAChanged(event)}
            />
          </div>

          <div className="col m2 s4 right">
            <PlayerSelect
              value={playerBName}
              players={playerNames}
              onChange={(event) => this.playerBChanged(event)}
            />
          </div>
        </div>
      </div>
    )
  }
}
