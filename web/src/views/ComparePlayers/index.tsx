import * as ls from 'local-storage'
import React, { useState } from 'react'
import Container from '@mui/material/Container'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Chart from './Chart'
import { keys, pick } from 'lodash'
import { Stats, StatLine } from '../../api'

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

export default function ComparePlayers(props: {stats: Stats}) {
  const playerNames = keys(props.stats)
  const [playerA, setPlayerA] = useState(ls.get<string>('playerA') || playerNames[0])
  const [playerB, setPlayerB] = useState(ls.get<string>('playerB') || playerNames[1])

  const playerAChanged = (_event: React.ChangeEvent<{}>, value: string | null) => {
    ls.set<string>('playerA', value as string)
    setPlayerA(value as string)
  }

  const playerBChanged = (_event: React.ChangeEvent<{}>, value: string | null) => {
    ls.set<string>('playerB', value as string)
    setPlayerB(value as string)
  }

  const playerAStats = pick(props.stats[playerA], STATS)
  const playerBStats = pick(props.stats[playerB], STATS)

  return (
    <Container fixed>
      <div style={{paddingTop: '20px'}}>
        <Chart
          labels={STATS}
          playerAName={playerA}
          playerAStats={playerAStats as StatLine}
          playerBName={playerB}
          playerBStats={playerBStats as StatLine}
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
