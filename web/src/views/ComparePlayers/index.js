import ls from 'local-storage'
import React, { Component } from 'react'
import Container from '@material-ui/core/Container'
import TextField from '@material-ui/core/TextField'
import Autocomplete from '@material-ui/lab/Autocomplete'
import Chart from './Chart'
import { keys, pick } from 'lodash'

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

    const playerNames = keys(this.props.stats)

    this.state = {
      week: this.props.week,
      stats: this.props.stats,
      playerAName: ls.get('playerA') || playerNames[0],
      playerBName: ls.get('playerB') || playerNames[1]
    }
  }

  playerAChanged = (_event, value) => {
    ls.set('playerA', value)
    this.setState({playerAName: value})
  }

  playerBChanged = (_event, value) => {
    ls.set('playerB', value)
    this.setState({playerBName: value})
  }

  render () {
    const { stats, playerAName, playerBName } = this.state
    const playerAStats = pick(stats[playerAName], STATS)
    const playerBStats = pick(stats[playerBName], STATS)
    const playerNames = keys(this.props.stats)

    return (
      <Container fixed>
        <div style={{paddingTop: '20px'}}>
          <Chart
            labels={STATS}
            playerAName={playerAName}
            playerAStats={playerAStats}
            playerBName={playerBName}
            playerBStats={playerBStats}
          />
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', paddingTop: 20}}>
          <Autocomplete
            value={playerAName}
            options={playerNames}
            onChange={this.playerAChanged}
            style={{ width: 300 }}
            renderInput={params => (
              <TextField {...params} variant="outlined" fullWidth />
            )}
          />
          <Autocomplete
            value={playerBName}
            options={playerNames}
            onChange={this.playerBChanged}
            style={{ width: 300 }}
            renderInput={params => (
              <TextField {...params} variant="outlined" fullWidth />
            )}
          />
        </div>
      </Container>
    )
  }
}
