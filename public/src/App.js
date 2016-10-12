// @flow

import React, { Component } from 'react'
import Nav from './Nav'
import Stats from './Stats'

class App extends Component {
  state: {
    week: number
  }

  constructor (props: any) {
    super(props)

    this.state = {
      week: 1
    }
  }

  weekChange (week: number) {
    this.setState({week: week})
  }

  render () {
    let week = this.state.week
    let weeks = [1, 2]

    let weekChange = this.weekChange.bind(this)

    return (
      <div>
        <Nav week={week} weeks={weeks} weekChange={weekChange} />
        <div className="container" style={{height: '100%', minHeight: '100%'}}>
          <Stats week={week}/>
        </div>
      </div>
    )
  }
}

export default App
