import React, { Component } from 'react'

type Props = {
  applyTrade: any
}

export default class Trades extends Component {
  state: {
    trades: Array<any>
  }

  constructor (props: Props) {
    super(props)

    this.state = {
      trades: []
    }
  }

  render () {
    return (
      <div>
        wat
      </div>
    )
  }
}
