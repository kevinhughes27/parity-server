import ls from 'local-storage'
import React, { useState } from 'react'
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

export default function ComparePlayers(props) {
  const playerNames = keys(props.stats)
  const [playerA, setPlayerA] = useState(ls.get('playerA') || playerNames[0])
  const [playerB, setPlayerB] = useState(ls.get('playerB') || playerNames[1])

  const playerAChanged = (_event, value) => {
    ls.set('playerA', value)
    setPlayerA(value)
  }

  const playerBChanged = (_event, value) => {
    ls.set('playerB', value)
    setPlayerB(value)
  }

  const playerAStats = pick(props.stats[playerA], STATS)
  const playerBStats = pick(props.stats[playerB], STATS)

  return (
    <Container fixed>
      <div style={{paddingTop: '20px'}}>
        <Chart
          labels={STATS}
          playerAName={playerA}
          playerAStats={playerAStats}
          playerBName={playerB}
          playerBStats={playerBStats}
        />
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', paddingTop: 20}}>
        <Autocomplete
          value={playerA}
          options={playerNames}
          onChange={playerAChanged}
          style={{ width: 300 }}
          renderInput={params => (
            <TextField {...params} variant="outlined" fullWidth />
          )}
        />
        <Autocomplete
          value={playerB}
          options={playerNames}
          onChange={playerBChanged}
          style={{ width: 300 }}
          renderInput={params => (
            <TextField {...params} variant="outlined" fullWidth />
          )}
        />
      </div>
    </Container>
  )
}
