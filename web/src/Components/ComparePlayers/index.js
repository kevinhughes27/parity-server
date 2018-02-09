import _ from 'lodash'
import ls from 'local-storage'
import React, { Component } from 'react'
import PlayerSelect from '../PlayerSelect'
import Chart from './Chart'

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

export default class ComparePlayers extends Component {
  constructor (props) {
    super(props)

    const playerNames = _.keys(this.props.stats)

    this.state = {
      week: this.props.week,
      stats: this.props.stats,
      playerAName: ls.get('playerA') || playerNames[0],
      playerBName: ls.get('playerB') || playerNames[1]
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

  render () {
    const { stats, playerAName, playerBName } = this.state
    const playerAStats = _.pick(stats[playerAName], STATS)
    const playerBStats = _.pick(stats[playerBName], STATS)
    const playerNames = _.keys(stats)

    return (
      <div>
        <div style={{paddingTop: '20px'}}>
          <Chart
            labels={STATS}
            playerAName={playerAName}
            playerAStats={playerAStats}
            playerBName={playerBName}
            playerBStats={playerBStats}
          />
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
