import React, { useState } from 'react'
import Layout from '../layout'
import Loading from '../components/Loading'
import LeaguePicker from '../components/LeaguePicker'
import WeekPicker from '../components/WeekPicker'
import { IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@material-ui/core'
import FilterListIcon from '@material-ui/icons/FilterList'
import { useMediaQuery } from 'react-responsive'
import { useLeague } from '../hooks/league'
import { useStats } from '../hooks/stats'
import { Stats } from '../api'

interface IStatsPageComponentProps {
  week: number;
  stats: Stats
}

function StatsPage(props: {component: React.FunctionComponent<IStatsPageComponentProps>}) {
  const [league] = useLeague();
  const [data, loading, changeWeek] = useStats(league);

  const [filtersOpen, openFilters] = useState(false)

  const isMobile = useMediaQuery({ query: '(max-device-width: 480px)' });

  const Filters = () => {
    const week = data.week || 0
    const weekOptions = [0, ...data.weeks] // add 0 for "all"

    if (isMobile) {
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
              <LeaguePicker color="black" onChange={() => openFilters(false)}/>
              <WeekPicker color="black" week={week} weeks={weekOptions} onChange={(w) => { openFilters(false); changeWeek(w) }} />
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
          <LeaguePicker color="white"/>
          <WeekPicker color="white" week={week} weeks={weekOptions} onChange={(w) => changeWeek(w)} />
        </React.Fragment>
      )
    }
  }

  const Main = () => {
    if (loading) return <Loading />;

    return (
      <div style={{height: '100%', minHeight: '100%'}}>
        { props.component({week: data.week, stats: data.stats}) }
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

export default StatsPage
