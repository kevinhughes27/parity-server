import React, { useState } from 'react'
import Layout from '../layout'
import Loading from '../components/Loading'
import LeaguePicker from '../components/LeaguePicker'
import WeekPicker from '../components/WeekPicker'
import GenderFilter from '../components/GenderFilter'
import { IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@material-ui/core'
import FilterListIcon from '@material-ui/icons/FilterList'
import withSizes from 'react-sizes'
import { pickBy } from 'lodash'
import { useLeague } from '../hooks/league'
import { useStats } from '../hooks/stats'

function StatsPage(props) {
  const [league] = useLeague();
  const [data, loading, changeWeek] = useStats(league);

  const [filtersOpen, openFilters] = useState(false)
  const [filter, setFilter] = useState('any')

  const genderChange = (event) => {
    const filter = event.target.value
    setFilter(filter)
  }

  const filteredStats = () => {
    if (filter === 'any') {
      return data.stats;
    }

    return pickBy(data.stats, (statEntry) => {
      return statEntry.gender === filter;
    })
  }

  const Filters = () => {
    const week = data.week || 0
    const weekOptions = [0, ...data.weeks] // add 0 for "all"

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
              <WeekPicker week={week} weeks={weekOptions} onChange={(ev) => changeWeek(ev.target.value)} />
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
          <WeekPicker week={week} weeks={weekOptions} onChange={(ev) => changeWeek(ev.target.value)} />
        </React.Fragment>
      )
    }
  }

  const Main = () => {
    if (loading) return <Loading />;

    return (
      <div style={{height: '100%', minHeight: '100%'}}>
        { React.cloneElement(props.children, {week: data.week, stats: filteredStats()}) }
      </div>
    );
  }

  return (
    <React.Fragment>
      <Layout>
        <Filters />
      </Layout>
      <Main />
    </React.Fragment>
  );
}

const mapSizesToProps = ({ width }) => ({
  isMobile: width < 480,
})

export default withSizes(mapSizesToProps)(StatsPage)
