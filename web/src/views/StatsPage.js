import React, { Component } from 'react'
import TopNav from '../layout/TopNav'
import Loading from '../components/Loading'
import LeaguePicker from '../components/LeaguePicker'
import WeekPicker from '../components/WeekPicker'
import GenderFilter from '../components/GenderFilter'
import { IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@material-ui/core'
import FilterListIcon from '@material-ui/icons/FilterList'
import withSizes from 'react-sizes'
import { last, pickBy } from 'lodash'
import { currentLeague, fetchWeeks, fetchStats } from "../api"

class StatsProvider extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loading: true,
      filtersOpen: false,
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

  leagueChange = (league) => {
    return (async () => {
      this.setState({loading: true})
      const weeks = await fetchWeeks(league)
      const week = last(weeks) || 0
      const stats = await fetchStats(week, league)
      this.setState({ weeks, week, stats, loading: false })
    })()
  }

  weekChange = (event) => {
    const week = event.target.value
    const league = currentLeague()
    return (async () => {
      this.setState({week, loading: true})
      const stats = await fetchStats(week, league)
      this.setState({ stats, loading: false })
    })()
  }

  genderChange = (event) => {
    const filter = event.target.value
    this.setState({ filter })
  }

  openFilters = () => {
    this.setState({filtersOpen: true})
  }

  closeFilters = () => {
    this.setState({filtersOpen: false})
  }

  filteredStats(filter, stats) {
    if (filter === 'any') {
      return stats;
    }

    return pickBy(stats, (statEntry) => {
      return statEntry.gender === filter;
    })
  }

  renderFilters () {
    const week = this.state.week
    const weeks = [0, ...this.state.weeks]
    const genderFilter = this.state.filter

    if (this.props.isMobile) {
      return (
        <React.Fragment>
          <IconButton onClick={this.openFilters}>
            <FilterListIcon style={{color: "white"}} />
          </IconButton>
          <Dialog
            disableBackdropClick
            disableEscapeKeyDown
            maxWidth="sm"
            fullWidth={true}
            open={this.state.filtersOpen}
            onClose={this.closeFilters}
          >
            <DialogTitle>Filters</DialogTitle>
            <DialogContent className="filters">
              <LeaguePicker onChange={this.leagueChange} />
              <GenderFilter filter={genderFilter} onChange={this.genderChange} />
              <WeekPicker week={week} weeks={weeks} onChange={this.weekChange} />
            </DialogContent>
            <DialogActions>
              <Button onClick={this.closeFilters} color="primary">
                Close
              </Button>
            </DialogActions>
          </Dialog>
        </React.Fragment>
      )
    } else {
      return (
        <React.Fragment>
          <LeaguePicker onChange={this.leagueChange} />
          <GenderFilter filter={genderFilter} onChange={this.genderChange} />
          <WeekPicker week={week} weeks={weeks} onChange={this.weekChange} />
        </React.Fragment>
      )
    }
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
        <TopNav>
          { this.renderFilters() }
        </TopNav>
        { this.renderMain() }
      </div>
    )
  }
}

const mapSizesToProps = ({ width }) => ({
  isMobile: width < 480,
})

export default withSizes(mapSizesToProps)(StatsProvider)
