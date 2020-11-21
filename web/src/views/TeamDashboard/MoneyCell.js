import React from 'react'
import format from 'format-number'

export default function MoneyCell(props) {
  const value = Math.round(props.data)
  const text = format({prefix: '$'})(value)

  return (
    <span>{text}</span>
  )
}
