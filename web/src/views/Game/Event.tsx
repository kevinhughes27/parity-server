import React from 'react'
import { PointEvent } from '../../api'
import CelebrationIcon from '@mui/icons-material/Celebration'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import ShieldIcon from '@mui/icons-material/Shield'
import ReplyIcon from '@mui/icons-material/Reply'
import CallMissedIcon from '@mui/icons-material/CallMissed'

export default function Event(props: {event: PointEvent, isCallahan?: boolean}) {
  const event = props.event
  const isCallahan = props.isCallahan

  if (isCallahan) {
    return (
      <span>
        <CelebrationIcon fontSize="small" style={{marginRight: 5}}/> {event.firstActor} got a Callahan!
      </span>
    )
  }

  switch (event.type) {
    case 'POINT':
      return (
        <span>
          <EmojiEventsIcon fontSize="small" style={{marginRight: 5}}/> {event.firstActor} scored!
        </span>
      )
    case 'DEFENSE':
      return (
        <span>
          <ShieldIcon fontSize="small" style={{marginRight: 5}}/> {event.firstActor} got a block
        </span>
      )
    case 'THROWAWAY':
      return (
        <span>
          <ReplyIcon fontSize="small" style={{marginRight: 5}}/> {event.firstActor} threw it away
        </span>
      )
    case 'DROP':
      return (
        <span>
          <CallMissedIcon fontSize="small" style={{marginRight: 5}}/> {event.firstActor} dropped it
        </span>
      )
    case 'PASS':
      return (
        <span>
          {event.firstActor} passed to {event.secondActor}
        </span>
      )
    case 'PULL':
      return (
        <span>
          {event.firstActor} pulled
        </span>
      )
    default:
      return null
  }
}
