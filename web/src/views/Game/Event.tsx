import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrophy, faShieldAlt, faLevelDownAlt, faMeteor } from '@fortawesome/free-solid-svg-icons'
import { PointEvent } from '../../api'

export default function Event(props: {event: PointEvent, isCallahan: boolean}) {
  const { event, isCallahan } = props

  if (event.type === 'PULL') {
    return (
      <span>
        {event.firstActor} pulled
      </span>
    )
  }

  if (event.type === 'PASS') {
    return (
      <span>
        {event.firstActor} passed to {event.secondActor}
      </span>
    )
  }

  if (event.type === 'POINT') {

    if (isCallahan){
      return (
        <span>
          <FontAwesomeIcon icon={faMeteor} style={{marginRight: 5}}/> {event.firstActor} got a Callahan!
        </span>
      )
    } else {
      return (
        <span>
          <FontAwesomeIcon icon={faTrophy} style={{marginRight: 5}}/> {event.firstActor} scored!
        </span>
      )
    }
    
  }

  if (event.type === 'DEFENSE') {
    return (
      <span>
        <FontAwesomeIcon icon={faShieldAlt} style={{marginRight: 5}}/> {event.firstActor} got a block
      </span>
    )
  }

  if (event.type === 'THROWAWAY') {
    return (
      <span>
        <FontAwesomeIcon icon={faLevelDownAlt} style={{marginRight: 5}}/> {event.firstActor} threw it away
      </span>
    )
  }

  if (event.type === 'DROP') {
    return (
      <span>
        <FontAwesomeIcon icon={faLevelDownAlt} style={{marginRight: 5}}/> {event.firstActor} dropped it
      </span>
    )
  }

  return null;
}
