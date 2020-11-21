import React, { useState } from 'react'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'
import Collapse from '@material-ui/core/Collapse'
import ExpandLess from '@material-ui/icons/ExpandLess'
import ExpandMore from '@material-ui/icons/ExpandMore'
import Typography from '@material-ui/core/Typography'
import Autocomplete from '@material-ui/lab/Autocomplete'
import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBolt } from '@fortawesome/free-solid-svg-icons'
import format from 'date-fns/format'
import Event from './Event'
import { last, includes } from 'lodash'
import { homeColors, awayColors } from '../../helpers'

export default function Points(props) {
  const game = props.game;
  const points = props.game.points;
  const players = [...game.homeRoster, ...game.awayRoster]

  const [focus, setFocus] = useState("");
  const [expanded, setExpanded] = useState([]);

  const expandAll = () => {
    const expanded = points.map((p, idx) => idx)
    setExpanded(expanded)
  }

  const collapseAll = () => {
    setFocus("")
    setExpanded([])
  }

  const handleClick = (isExpanded, idx) => {
    if (isExpanded) {
      setExpanded(expanded.filter(x => x !== idx))
    } else {
      setExpanded([...expanded, idx])
    }
  }

  const playerFocused = (_event, player) => {
    setFocus(player)

    let playerPoints = []

    points.forEach((p, idx) => {
      if (includes(JSON.stringify(p.events), player)) {
        playerPoints.push(idx)
      }
    })

    setExpanded(playerPoints)
  }

  const renderButton = () => {
    if (expanded.length >= 1) {
      return (
        <Button onClick={collapseAll}>
          Collapse All <ExpandLess />
        </Button>
      )
    } else {
      return (
        <Button onClick={expandAll}>
          Expand All <ExpandMore />
        </Button>
      )
    }
  }

  const renderPoint = (point, homeScore, awayScore, idx) => {
    const events = point.events;
    const firstEvent = events[0]
    const lastEvent = last(events)
    const secondLastEvent = events[events.length - 2]

    const receiver = lastEvent.firstActor

    const thrower = secondLastEvent.type === 'PASS'
      ? secondLastEvent.firstActor
      : null

    const homeScored = includes(game.homeRoster, receiver)
    const teamName = homeScored
      ? game.homeTeam
      : game.awayTeam

    const homeColor = homeColors[8]
    const awayColor = awayColors[8]
    const teamColor = homeScored
      ? homeColor
      : awayColor

    const teamJsx = <strong style={{color: teamColor}}>{teamName}</strong>

    const breakPoint = includes(point.defensePlayers, receiver)

    const whatCopy = breakPoint
      ? 'Break Point'
      : 'Point'

    const iconJsx = breakPoint
      ? (<FontAwesomeIcon icon={faBolt}/>)
      : null

    const whoCopy = thrower
      ? `${thrower} to ${receiver}`
      : receiver

    let durationCopy = null;
    if (firstEvent.timestamp) {
      const startTime = new Date(firstEvent.timestamp)
      const endTime = new Date(lastEvent.timestamp)

      const duration = format(endTime - startTime, "m:ss")
      durationCopy = `(${duration} minutes)`
    }

    if (homeScored) {
      homeScore = homeScore + 1
    } else {
      awayScore = awayScore + 1
    }

    const scoreCopy = `${homeScore} - ${awayScore}`

    const isExpanded = includes(expanded, idx)

    const pointsJsx = (
      <React.Fragment key={idx}>
        <ListItem button onClick={() => handleClick(isExpanded, idx)}>
          <ListItemText>
            <div style={{display: 'flex', flex: 1, justifyContent: 'space-between'}}>
              <span>{iconJsx} {whatCopy} {teamJsx} {whoCopy} {durationCopy}</span>
              <span style={{minWidth: 44}}>{scoreCopy}</span>
            </div>
          </ListItemText>
          {isExpanded ? <ExpandLess /> : <ExpandMore />}
        </ListItem>

        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List style={{paddingLeft: 20}}>
            { point.events.map((ev, idx) => {
              const highlight = ev.firstActor === focus || ev.secondActor === focus
              const mute = focus && !highlight

              const styles = {}

              if (highlight) {
                styles['fontWeight'] = 'bold'
              } else if (mute) {
                styles['color'] = 'grey'
              }

              return (
                <ListItem key={idx} style={styles}>
                  <Event event={ev}/>
                </ListItem>
              )
            })}
          </List>
        </Collapse>
      </React.Fragment>
    )

    return {
      homeScore,
      awayScore,
      jsx: pointsJsx
    }
  }

  let homeScore = 0
  let awayScore = 0

  return (
    <React.Fragment>
      <div style={{display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap'}}>
        <Typography variant='h5' className={'game-points-title'} style={{marginTop: 15}}>
          Points
        </Typography>
        <div style={{display: 'flex', flexDirection: 'row'}}>
          <Typography variant='button' style={{marginTop: 15, marginRight: 20, marginLeft: 8}}>
            Focus Player:
          </Typography>
          <Autocomplete
            value={focus}
            options={players}
            style={{ width: 200, marginTop: 8 }}
            onChange={playerFocused}
            renderInput={params => (
              <TextField {...params} fullWidth style={{height: 30}} />
            )}
          />
        </div>
        { renderButton() }
      </div>
      <List>
        { points.map((point, idx) => {
          const result = renderPoint(point, homeScore, awayScore, idx)
          homeScore = result.homeScore
          awayScore = result.awayScore
          return result.jsx
        })}
      </List>
    </React.Fragment>
  )
}
