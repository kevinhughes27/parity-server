// @flow

import _ from 'lodash'
import React, { Component } from 'react'
import Nav from './Nav'
import { Link } from 'react-router'
import StatsTable from './StatsTable'
import Stats from './Stats'
import Loading from './Loading'
import request from 'browser-request'

class App extends Component {
  state: {
    loading: boolean,
    weeks: any,
    week: number,
    stats: any
  }

  constructor (props: any) {
    super(props)

    this.state = {
      loading: true,
      weeks: [],
      week: 0,
      stats: {}
    }
  }

  componentWillMount () {
    this._fetchWeeks()
  }

  _fetchWeeks () {
    request('/weeks', (er, response, body) => {
      let weeks = JSON.parse(body)
      this.setState({ weeks: weeks })
      let week = _.last(weeks) || 0
      this.weekChange(week)
    })
  }

  _fetchWeek (num: number) {
    let url = `/weeks/${num}`
    if (num === 0) url = '/stats'

    request(url, (er, response, body) => {
      let data = body ? JSON.parse(body).stats : {}
      let stats = new Stats(data)
      this.setState({ stats: stats, loading: false })
    })
  }

  weekChange (week: number) {
    this.setState({week: week, loading: true})
    this._fetchWeek(week)
  }

  renderNav () {
    let week = this.state.week
    let weeks = [0, ...this.state.weeks]
    let weekChange = this.weekChange.bind(this)
    let docsUrl = 'https://parity-server.herokuapp.com/docs'
    let srcUrl = 'https://github.com/kevinhughes27/parity-server'

    return (
      <Nav week={week} weeks={weeks} weekChange={weekChange}>
        <li><Link to='/'>Raw Stats</Link></li>
        <li><Link to='/compare_players'>Compare Players</Link></li>
        <li><Link to='/team_dashboard'>Team Dashboard</Link></li>
        <li><Link to='/trade_simulator'>Trade Simulator</Link></li>
        <li><a href={docsUrl} target='_blank'>API Documentation</a></li>
        <li><a href={srcUrl} target='_blank'>Source Code</a></li>
      </Nav>
    )
  }

  renderMain () {
    if (this.state.loading) return (<Loading />)

    let week = this.state.week
    let stats = this.state.stats

    return (
      <div className="container" style={{height: '100%', minHeight: '100%'}}>
        { this.props.children
          ? React.cloneElement(this.props.children, {week: week, stats: stats})
          : <StatsTable week={week} stats={stats}/>
        }
      </div>
    )
  }

  render () {
    return (
      <div>
        { this.renderNav() }
        { this.renderMain() }
      </div>
    )
  }
}

export default App
