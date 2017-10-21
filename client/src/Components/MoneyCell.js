// @flow

import React, { Component } from 'react'
import format from 'format-number'

type Props = {
  data: number
}

export default class MoneyCell extends Component {
  props: Props

  render () {
    let value = this.props.data
    value = Math.round(value)

    let text = format({prefix: '$'})(value)

    return (
      <span>{text}</span>
    )
  }
}
