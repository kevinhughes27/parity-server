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

  const [weeks, setWeeks] = useState([])
  const [week, setWeek] = useState(0)
  const [stats, setStats] = useState({})

  const [filtersOpen, openFilters] = useState(false)
  const [filter, setFilter] = useState('any')

  React.useEffect(async () => {
    setLoading(true)
    const newWeeks = await fetchWeeks(league)
    const newWeek = last(newWeeks) || 0
    const newStats = await fetchStats(week, league)
    setWeeks(newWeeks)
    setWeek(newWeek)
    setStats(newStats)
    setLoading(false)
  }, [league])

  const weekChange = (event) => {
    const newWeek = event.target.value
    return (async () => {
      setLoading(true)
      const newStats = await fetchStats(week, league)
      setWeek(newWeek)
      setStats(newStats)
      setLoading(false)
    })()
  }

  const genderChange = (event) => {
    const filter = event.target.value
    setFilter(filter)
  }

  const filteredStats = () => {
    if (filter === 'any') {
      return stats;
    }

    return pickBy(stats, (statEntry) => {
      return statEntry.gender === filter;
    })
  }

  const Filters = () => {
    // add 0 for "all"
    const weekOptions = [0, ...weeks]

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
              <GenderFilter filter={filter} onChange={genderChange} />
              <WeekPicker week={week} weeks={weekOptions} onChange={weekChange} />
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
          <GenderFilter filter={filter} onChange={genderChange} />
          <WeekPicker week={week} weeks={weeks} onChange={weekChange} />
        </React.Fragment>
      )
    }
  }

  const Main = () => {
    if (loading) return (<Loading />)

    return (
      <div style={{height: '100%', minHeight: '100%'}}>
        { React.cloneElement(props.children, {week: week, stats: filteredStats()}) }
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
