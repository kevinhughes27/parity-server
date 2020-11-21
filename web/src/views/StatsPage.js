import React, { useState } from 'react'
import Layout from '../layout'
import Loading from '../components/Loading'
import LeaguePicker from '../components/LeaguePicker'
import WeekPicker from '../components/WeekPicker'
import GenderFilter from '../components/GenderFilter'
import { IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@material-ui/core'
import FilterListIcon from '@material-ui/icons/FilterList'
import withSizes from 'react-sizes'
import { last, pickBy } from 'lodash'
import { useLeague } from '../hooks/league'
import { fetchWeeks, fetchStats } from "../api"

function StatsProvider(props) {
  const [league] = useLeague();
  const [loading, setLoading] = useState(true)
  const [filtersOpen, openFilters] = useState(false)
  const [state, setState] = useState({
    weeks: [],
    week: 0,
    stats: {},
    filter: 'any',
  });

  React.useEffect(async () => {
    setLoading(true)
    const weeks = await fetchWeeks(league)
    const week = last(weeks) || 0
    const stats = await fetchStats(week, league)
    setState({...state, weeks, week, stats})
    setLoading(false)
  }, [league])

  const weekChange = (event) => {
    const week = event.target.value
    return (async () => {
      setLoading(true)
      const stats = await fetchStats(week, league)
      setState({...state, week, stats})
      setLoading(false)
    })()
  }

  const genderChange = (event) => {
    const filter = event.target.value
    setState({...state, filter})
  }

  const filteredStats = (filter, stats) => {
    if (filter === 'any') {
      return stats;
    }

    return pickBy(stats, (statEntry) => {
      return statEntry.gender === filter;
    })
  }

  const Filters = () => {
    const week = state.week
    const weeks = [0, ...state.weeks]
    const genderFilter = state.filter

    if (props.isMobile) {
      return (
        <React.Fragment>
          <IconButton onClick={() => openFilters(true)}>
            <FilterListIcon style={{color: "white"}} />
          </IconButton>
          <Dialog
            disableBackdropClick
            disableEscapeKeyDown
            maxWidth="sm"
            fullWidth={true}
            open={filtersOpen}
            onClose={() => openFilters(false)}
          >
            <DialogTitle>Filters</DialogTitle>
            <DialogContent className="filters">
              <LeaguePicker />
              <GenderFilter filter={genderFilter} onChange={genderChange} />
              <WeekPicker week={week} weeks={weeks} onChange={weekChange} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => openFilters(false)} color="primary">
                Close
              </Button>
            </DialogActions>
          </Dialog>
        </React.Fragment>
      )
    } else {
      return (
        <React.Fragment>
          <LeaguePicker />
          <GenderFilter filter={genderFilter} onChange={genderChange} />
          <WeekPicker week={week} weeks={weeks} onChange={weekChange} />
        </React.Fragment>
      )
    }
  }

  const Main = () => {
    if (loading) return (<Loading />)

    const stats = filteredStats(state.filter, state.stats)

    return (
      <div style={{height: '100%', minHeight: '100%'}}>
        { React.cloneElement(props.children, {week: state.week, stats: stats}) }
      </div>
    );
  }

  return (
    <div>
      <Layout>
        <Filters />
      </Layout>
      <Main />
    </div>
  )
}

const mapSizesToProps = ({ width }) => ({
  isMobile: width < 480,
})

export default withSizes(mapSizesToProps)(StatsProvider)
