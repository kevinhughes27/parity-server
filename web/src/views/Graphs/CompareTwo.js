import ls from 'local-storage'
import React, { Component } from 'react'
import Container from '@material-ui/core/Container'
import TextField from '@material-ui/core/TextField'
import Autocomplete from '@material-ui/lab/Autocomplete'
import { Bar } from 'react-chartjs-2'
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

export default class CompareTwo extends Component {
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

    return (
      <Container fixed>
        <div style={{paddingTop: '20px'}}>
          <Bar data={data} redraw={true} options={options}/>
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
