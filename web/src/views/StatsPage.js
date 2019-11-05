import React, { Component } from 'react'
import TopNav from '../layout/TopNav'
import Loading from '../components/Loading'
import LeaguePicker from '../components/LeaguePicker'
import WeekPicker from '../components/WeekPicker'
import GenderFilter from '../components/GenderFilter'
import { last, pickBy } from 'lodash'
import { currentLeague, fetchWeeks, fetchStats } from "../api"

class StatsProvider extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loading: true,
      weeks: [],
      week: 0,
      stats: {},
      filter: 'any',
    }
  }

  componentDidMount () {
    const league = currentLeague()
    return (async () => {
      const weeks = await fetchWeeks(league)
      const week = last(weeks) || 0
      const stats = await fetchStats(week, league)
      this.setState({weeks, week, stats, loading: false})
    })()
  }

  leagueChange (league) {
    return (async () => {
      this.setState({loading: true})
      const weeks = await fetchWeeks(league)
      const week = last(weeks) || 0
      const stats = await fetchStats(week, league)
      this.setState({ weeks, week, stats, loading: false })
    })()
  }

  weekChange (event) {
    const week = event.target.value
    return (async () => {
      this.setState({week, loading: true})
      const stats = await fetchStats(week, this.state.league)
      this.setState({ stats, loading: false })
    })()
  }

  genderChange (event) {
    const filter = event.target.value
    this.setState({ filter })
  }

  filteredStats(filter, stats) {
    if (filter === 'any') {
      return stats;
    }

    return pickBy(stats, (statEntry) => {
      return statEntry.gender === filter;
    })
  }

  renderNav () {
    const leagueChange = this.leagueChange.bind(this)
    const week = this.state.week
    const weeks = [0, ...this.state.weeks]
    const weekChange = this.weekChange.bind(this)
    const genderFilter = this.state.filter
    const genderChange = this.genderChange.bind(this)

    return (
      <TopNav>
        <LeaguePicker onChange={leagueChange} />
        <GenderFilter filter={genderFilter} onChange={genderChange} />
        <WeekPicker week={week} weeks={weeks} onChange={weekChange} />
      </TopNav>
    )
  }

  renderMain () {
    if (this.state.loading) return (<Loading />)

    const { week, filter } = this.state
    const stats = this.filteredStats(filter, this.state.stats)

    return (
      <div style={{height: '100%', minHeight: '100%'}}>
        { React.cloneElement(this.props.children, {week: week, stats: stats}) }
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
