import _ from 'lodash'
import React, { Component } from 'react'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'
import Collapse from '@material-ui/core/Collapse'
import ExpandLess from '@material-ui/icons/ExpandLess'
import ExpandMore from '@material-ui/icons/ExpandMore'
import Typography from '@material-ui/core/Typography'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBolt } from '@fortawesome/free-solid-svg-icons'
import format from 'date-fns/format'
import Event from './Event'

export default class Points extends Component {
  state = {
    expanded: []
  }

  handleClick = (expanded, idx) => {
    if (expanded) {
      this.setState({
        expanded:  this.state.expanded.filter(x => x !== idx)
      })
    } else {
      this.setState({
        expanded: [...this.state.expanded, idx]
      })
    }
  }

  render () {
    const game = this.props.game

    let homeScore = 0
    let awayScore = 0

    return (
      <React.Fragment>
        <Typography variant="h5" style={{marginTop: 15}}>
          Points
        </Typography>
        <List>
          { game.points.map((point, idx) => {
            const result = this.renderPoint(point, homeScore, awayScore, idx)
            homeScore = result.homeScore
            awayScore = result.awayScore
            return result.jsx
          })}
        </List>
      </React.Fragment>
    )
  }

  renderPoint (point, homeScore, awayScore, idx) {
    const game = this.props.game

    const events = point.events;
    const firstEvent = events[0]
    const lastEvent = _.last(events)
    const secondLastEvent = events[events.length - 2]

    const receiver = lastEvent.firstActor

    const thrower = secondLastEvent.type === 'PASS'
      ? secondLastEvent.firstActor
      : null

    const homeScored = _.includes(game.homeRoster, receiver)
    const teamName = homeScored
      ? game.homeTeam
      : game.awayTeam

    const homeColor = '#98abc5'
    const awayColor = '#ff8c00'
    const teamColor = homeScored
      ? homeColor
      : awayColor

    const teamJsx = <strong style={{color: teamColor}}>{teamName}</strong>

    const breakPoint = _.includes(point.defensePlayers, receiver)

    const whatCopy = breakPoint
      ? 'Break Point'
      : 'Point'

    const iconJsx = breakPoint
      ? (<FontAwesomeIcon icon={faBolt}/>)
      : null

    const whoCopy = thrower
      ? `${thrower} to ${receiver}`
      : receiver

    const startTime = new Date(firstEvent.timestamp)
    const endTime = new Date(lastEvent.timestamp)

    const duration = format(endTime - startTime, "m:ss")
    const durationCopy = `(${duration} minutes)`

    if (homeScored) {
      homeScore = homeScore + 1
    } else {
      awayScore = awayScore + 1
    }

    const scoreCopy = `${homeScore} - ${awayScore}`

    const expanded = _.includes(this.state.expanded, idx)

    const pointsJsx = (
      <React.Fragment key={idx}>
        <ListItem button onClick={() => this.handleClick(expanded, idx)}>
          <ListItemText>
            <div style={{display: 'flex', flex: 1, justifyContent: 'space-between'}}>
              <span>{iconJsx} {whatCopy} {teamJsx} {whoCopy} {durationCopy}</span>
              <span style={{minWidth: 44}}>{scoreCopy}</span>
            </div>
          </ListItemText>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </ListItem>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <List style={{paddingLeft: 20}}>
            { point.events.map((ev, idx) => <Event key={idx} event={ev} />) }
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
}
