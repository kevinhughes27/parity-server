import React, { useState, useRef } from 'react'
import Points from './Points'
import Button from '@mui/material/Button'
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror'
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
  const [saving, setSaving] = useState(false)
  const cmRef = useRef<ReactCodeMirrorRef>(null)

  const Preview = () => {
    try {
      const newGame = JSON.parse(json)
      return (<Points game={newGame}/>)
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
      <div style={{display: 'flex'}}>
        <CodeMirror
          value={json}
          ref={cmRef}
          height="100%"
          extensions={[jsonLang()]}
          onChange={(value, _viewUpdate) => {
            setJson(value)
          }}
        />
        <div>
          <Preview/>
        </div>
      </div>
      <Button
        variant='outlined'
        disabled={saving}
        style={{position: 'fixed', right: 5, bottom: 5}}
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
