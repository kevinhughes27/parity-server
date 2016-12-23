// @flow

import _ from 'lodash'
import React, { Component } from 'react'
import Nav from './Nav'
import { Link } from 'react-router'
import Loader from './Loader'
import Loading from './Loading'
import StatsTable from './StatsTable'

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

  async componentDidMount () {
    let weeks = await Loader.fetchWeeks()
    let week = _.last(weeks) || 0
    let stats = await Loader.fetchStats(week)
    this.setState({weeks, week, stats, loading: false})
  }

  async weekChange (week: number) {
    this.setState({week, loading: true})
    let stats = await Loader.fetchStats(week)
    this.setState({ stats, loading: false })
  }

  renderNav () {
    let week = this.state.week
    let weeks = [0, ...this.state.weeks]
    let weekChange = this.weekChange.bind(this)
    let spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1efPmmiEBjpAcVpSFlicd7b5b-1kDzBSPsAhebpupo7I/edit?usp=sharing'
    let docsUrl = 'https://parity-server.herokuapp.com/docs'
    let srcUrl = 'https://github.com/kevinhughes27/parity-server'

    return (
      <Nav week={week} weeks={weeks} weekChange={weekChange}>
        <li><Link to='/'>Raw Stats</Link></li>
        <li><Link to='/compare_players'>Compare Players</Link></li>
        <li><Link to='/team_dashboard'>Team Dashboard</Link></li>
        <li><Link to='/trade_simulator'>Trade Simulator</Link></li>
        <li><a href={spreadsheetUrl} target='_blank'>Spreadsheets</a></li>
        <li><a href={docsUrl} target='_blank'>API Documentation</a></li>
        <li><a href={srcUrl} target='_blank'>Source Code</a></li>
      </Nav>
    )
  }

  renderMain () {
    if (this.state.loading) return (<Loading />)

    let { week, stats } = this.state

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
