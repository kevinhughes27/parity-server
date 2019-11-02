import _ from 'lodash'
import React, { Component } from 'react'
import TopNav from '../layout/TopNav'
import Loading from '../components/Loading'
import LeaguePicker from '../components/LeaguePicker'
import WeekPicker from '../components/WeekPicker'
import GenderFilter from '../components/GenderFilter'
import StatsTable from '../components/StatsTable'
import { fetchLeagues, fetchWeeks, fetchStats } from "../api"

class StatsProvider extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loading: true,
      leagues: [],
      league: '',
      weeks: [],
      week: 0,
      stats: {},
      filter: 'any',
    }
  }

  componentDidMount () {
    (async () => {
      const leagues = await fetchLeagues()
      const league = _.first(leagues).league
      const weeks = await fetchWeeks(league)
      const week = _.last(weeks) || 0
      const stats = await fetchStats(week, league)
      this.setState({leagues, league, weeks, week, stats, loading: false})
    })()
  }

  filteredStats(filter, stats) {
    if (filter === 'any') {
      return stats;
    }

    return _.pickBy(stats, (statEntry) => {
      return statEntry.gender === filter;
    })
  }

  leagueChange (event) {
    const league = event.target.value
    return (async () => {
      this.setState({league, loading: true})
      const stats = await fetchStats(this.state.week, league)
      this.setState({ stats, loading: false })
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

  renderNav () {
    const league = this.state.league
    const leagues = [...this.state.leagues]
    const leagueChange = this.leagueChange.bind(this)
    const week = this.state.week
    const weeks = [0, ...this.state.weeks]
    const weekChange = this.weekChange.bind(this)
    const genderFilter = this.state.filter
    const genderChange = this.genderChange.bind(this)

    return (
      <TopNav>
        <LeaguePicker league={league} leagues={leagues} onChange={leagueChange} />
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
