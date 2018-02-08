import 'whatwg-fetch'
import _ from 'lodash'
import React, { Component } from 'react'
import TopNav from './TopNav'
import Loading from './Loading'
import WeekPicker from './WeekPicker'
import StatsTable from './StatsTable'

const fetchWeeks = async () => {
  const response = await fetch('/api/weeks')
  return await response.json()
}

const fetchStats = async (weekNum) => {
  let url = `/api/weeks/${weekNum}`
  if (weekNum === 0) url = '/api/stats'

  const response = await fetch(url)
  const json = await response.json()
  const data = json.stats || {}
  return data
}

class StatsProvider extends Component {
  constructor (props) {
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
      const weeks = await fetchWeeks()
      const week = _.last(weeks) || 0
      const stats = await fetchStats(week)
      this.setState({weeks, week, stats, loading: false})
    })()
  }

  weekChange (week) {
    (async () => {
      this.setState({week, loading: true})
      const stats = await fetchStats(week)
      this.setState({ stats, loading: false })
    })()
  }

  renderNav () {
    const week = this.state.week
    const weeks = [0, ...this.state.weeks]
    const weekChange = this.weekChange.bind(this)

    return (
      <TopNav>
        <ul className="right">
          <WeekPicker week={week} weeks={weeks} onChange={weekChange} />
        </ul>
      </TopNav>
    )
  }

  renderMain () {
    if (this.state.loading) return (<Loading />)

    const { week, stats } = this.state

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

export default StatsProvider
