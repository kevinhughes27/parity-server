import React, { Component } from 'react'
import ListItem from '@material-ui/core/ListItem'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrophy, faShieldAlt, faLevelDownAlt } from '@fortawesome/free-solid-svg-icons'

export default class Event extends Component {
  renderActor = (actor) => {
    if (actor === this.props.focus) {
      return <strong>{actor}</strong>
    } else {
      return actor
    }
  }

  render () {
    const { event, focus } = this.props

    if (event.type === 'PULL') {
      return (
        <ListItem className="collection-item">
          {this.renderActor(event.firstActor)} pulled
        </ListItem>
      )
    }

    if (event.type === 'PASS') {
      return (
        <ListItem className="collection-item">
          <span>{this.renderActor(event.firstActor)} passed to {this.renderActor(event.secondActor)}</span>
        </ListItem>
      )
    }

    if (event.type === 'POINT') {
      return (
        <ListItem className="collection-item">
          <FontAwesomeIcon icon={faTrophy} style={{marginRight: 5}}/> {this.renderActor(event.firstActor)} scored!
        </ListItem>
      )
    }

    if (event.type === 'DEFENSE') {
      return (
        <ListItem className="collection-item">
          <FontAwesomeIcon icon={faShieldAlt} style={{marginRight: 5}}/> {this.renderActor(event.firstActor)} got a block
        </ListItem>
      )
    }

    if (event.type === 'THROWAWAY') {
      return (
        <ListItem className="collection-item">
          <FontAwesomeIcon icon={faLevelDownAlt} style={{marginRight: 5}}/> {this.renderActor(event.firstActor)} threw it away
        </ListItem>
      )
    }

    if (event.type === 'DROP') {
      return (
        <ListItem className="collection-item">
          <FontAwesomeIcon icon={faLevelDownAlt} style={{marginRight: 5}}/> {this.renderActor(event.firstActor)} dropped it
        </ListItem>
      )
    }
  }
}
