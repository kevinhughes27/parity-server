import React, { useState } from 'react'
import { useParams } from 'react-router'
import Layout from '../../layout/'
import Loading from '../../components/Loading'
import Button from '@mui/material/Button'
import { fetchGame, saveGame, Game } from '../../api'

import { JsonEditor as Editor } from 'jsoneditor-react'
import 'jsoneditor-react/es/editor.min.css'

// import ace from 'brace'
// import 'brace/mode/json'
// import 'brace/theme/github'
//
// const schema = {
//   type: 'object',
//   properties: {
//     id: { type: 'integer' },
//     league_id: { type: 'integer' },
//     week: { type: 'integer' },
//     awayTeam: { type: 'string' },
//     awayRoster: { type: ['string'] },
//     awayScore: { type: 'integer' },
//     homeTeam: { type: 'string' },
//     homeRoster: { type: ['string'] },
//     homeScore: { type: 'integer' },
//     points: {
//       type: 'array',
//       items: {
//         type: 'object',
//         properties: {
//           defensePlayers: { type: 'array', items: { type: 'string' } },
//           offensePlayers: { type: 'array', items: { type: 'string' } },
//           events: {
//             type: 'array',
//             items: {
//               type: 'object',
//               properties: {
//                 firstActor: { type: 'string' },
//                 secondActor: { type: 'string' },
//                 timestamp: { type: 'string' },
//                 type: { type: 'string' }
//               }
//             }
//           }
//         }
//       }
//     }
//   }
// };

export default function GameEdit() {
  let params = useParams();

  const leagueId = params.leagueId as string
  const gameId = params.gameId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [game, setGame] = useState<Game|null>(null)

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const game = await fetchGame(gameId, leagueId)
      setGame(game)
      setLoading(false)
    }

    fetchData()
  }, [leagueId, gameId])

  const Main = () => {
    if (loading || game == null) return (<Loading />)

    return (
      <React.Fragment>
        <Editor
          value={game}
          history={true}
          onChange={(json: any) => setGame(json)}
        />
        <Button
          variant='outlined'
          disabled={saving}
          style={{position: 'fixed', right: 5, bottom: 5}}
          onClick={() => {
            setSaving(true)
            saveGame(gameId, leagueId, JSON.stringify(game))
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

  return (
    <React.Fragment>
      <Layout />
      <Main />
    </React.Fragment>
  )
}
