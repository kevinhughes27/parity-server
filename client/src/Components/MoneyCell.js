import React, { Component } from 'react'
import format from 'format-number'

export default class MoneyCell extends Component {
  render () {
    const value = Math.round(this.props.data)
    const text = format({prefix: '$'})(value)

    return (
      <span>{text}</span>
    )
  }
}
