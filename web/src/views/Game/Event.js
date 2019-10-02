import React, { Component } from 'react'
import ListItem from '@material-ui/core/ListItem'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrophy, faShieldAlt, faLevelDownAlt } from '@fortawesome/free-solid-svg-icons'

export default class Event extends Component {
  render () {
    const event = this.props.event

    if (event.type === 'PULL') {
      return (
        <ListItem className="collection-item">
          {event.firstActor} pulled
        </ListItem>
      )
    }

    if (event.type === 'PASS') {
      return (
        <ListItem className="collection-item">
          {event.firstActor} passed to {event.secondActor}
        </ListItem>
      )
    }

    if (event.type === 'POINT') {
      return (
        <ListItem className="collection-item">
          <FontAwesomeIcon icon={faTrophy} style={{marginRight: 5}}/> {event.firstActor} scored!
        </ListItem>
      )
    }

    if (event.type === 'DEFENSE') {
      return (
        <ListItem className="collection-item">
          <FontAwesomeIcon icon={faShieldAlt} style={{marginRight: 5}}/> {event.firstActor} got a block
        </ListItem>
      )
    }

    if (event.type === 'THROWAWAY') {
      return (
        <ListItem className="collection-item">
          <FontAwesomeIcon icon={faLevelDownAlt} style={{marginRight: 5}}/> {event.firstActor} threw it away
        </ListItem>
      )
    }

    if (event.type === 'DROP') {
      return (
        <ListItem className="collection-item">
          <FontAwesomeIcon icon={faLevelDownAlt} style={{marginRight: 5}}/> {event.firstActor} dropped it
        </ListItem>
      )
    }
  }
}
