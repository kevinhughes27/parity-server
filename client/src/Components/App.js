// @flow

import _ from 'lodash'
import React, { Component } from 'react'
import TopNav from './TopNav'
import SideNav from './SideNav'
import Loading from './Loading'
import StatsTable from './StatsTable'
import Loader from '../Loader'

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

  componentDidMount () {
    (async () => {
      let weeks = await Loader.fetchWeeks()
      let week = _.last(weeks) || 0
      let stats = await Loader.fetchStats(week)
      this.setState({weeks, week, stats, loading: false})
    })()
  }

  weekChange (week: number) {
    (async () => {
      this.setState({week, loading: true})
      let stats = await Loader.fetchStats(week)
      this.setState({ stats, loading: false })
    })()
  }

  renderNav () {
    let week = this.state.week
    let weeks = [0, ...this.state.weeks]
    let weekChange = this.weekChange.bind(this)

    return (
      <TopNav week={week} weeks={weeks} weekChange={weekChange}>
        <SideNav/>
      </TopNav>
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
