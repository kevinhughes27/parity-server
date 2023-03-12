import React, { useState } from 'react'
import Points from './Points'
import Button from '@mui/material/Button'
import CodeMirror from '@uiw/react-codemirror'
import { json as jsonLang } from '@codemirror/lang-json'
import { saveGame, Game } from '../../api'


export default function GameEditor(props: {gameId: string, leagueId: string, game: Game}) {
  const {
    homeTeam,
    homeRoster,
    homeScore,
    awayTeam,
    awayRoster,
    awayScore,
    points
  } = props.game

  const fields = {
    homeTeam,
    homeRoster,
    homeScore,
    awayTeam,
    awayRoster,
    awayScore,
    points
  }

  const [json, setJson] = React.useState(JSON.stringify(fields, null, 2))
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)

  const Preview = () => {
    try {
      const newGame = JSON.parse(json)
      return (
        <div style={{
          position: 'absolute',
          top: 64,
          left: 0,
          height: '100%',
          width: '100%',
          background: 'white'
        }}>
          <Points game={newGame}/>
        </div>
      )
    }
    catch(error) {
      if (error instanceof Error) {
        return (<p>{error.message}</p>)
      } else {
        throw error
      }
    }
  }

  return (
    <React.Fragment>
      <CodeMirror
        value={json}
        height="100%"
        width="100%"
        extensions={[jsonLang()]}
        onChange={(value, _viewUpdate) => {
          setJson(value)
        }}
      />
      { previewing ? <Preview/> : null }
      <Button
        style={{position: 'fixed', top: 10, right: 90, background: 'white'}}
        onClick={() => { setPreviewing(!previewing) }}
      >
        { previewing ? 'Close Preview' : 'Open Preview' }
      </Button>
      <Button
        disabled={saving}
        style={{position: 'fixed', top: 10, right: 10, background: 'white'}}
        onClick={() => {
          setSaving(true)
          saveGame(props.gameId, props.leagueId, json)
          .then((response) => {
            if (response.status === 200) {
              console.log("Success")
              setSaving(false)
            } else {
              console.log(response)
              setSaving(false)
            }
          })
        }}
      >
        { saving ? 'Saving' : 'Save' }
      </Button>
    </React.Fragment>
  )
}
