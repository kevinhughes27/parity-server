import React, { Component } from 'react'

export default class Event extends Component {
  render () {
    const event = this.props.event

    if (event.type === 'PULL') {
      return (
        <li className="collection-item">
          {event.firstActor} pulled
        </li>
      )
    }

    if (event.type === 'PASS') {
      return (
        <li className="collection-item">
          {event.firstActor} passed to {event.secondActor}
        </li>
      )
    }

    if (event.type === 'POINT') {
      return (
        <li className="collection-item">
          <i className='fa fa-trophy'/>  {event.firstActor} scored!
        </li>
      )
    }

    if (event.type === 'DEFENSE') {
      return (
        <li className="collection-item">
          <i className='fa fa-shield' /> {event.firstActor} got a block
        </li>
      )
    }

    if (event.type === 'THROWAWAY') {
      return (
        <li className="collection-item">
          <i className='fa fa-level-down'/> {event.firstActor} threw it away
        </li>
      )
    }

    if (event.type === 'DROP') {
      return (
        <li className="collection-item">
          <i className='fa fa-level-down'/> {event.firstActor} dropped it
        </li>
      )
    }
  }
}
