import React, { useState } from 'react'
import LeaguePicker from '../components/LeaguePicker'
import WeekPicker from '../components/WeekPicker'
import { IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'
import Stack from '@mui/material/Stack'
import FilterListIcon from '@mui/icons-material/FilterList'
import { useMediaQuery } from 'react-responsive'

const StatsFilters = ({data, changeWeek}: any) => {
  const [filtersOpen, openFilters] = useState(false)

  const isMobile = useMediaQuery({ query: '(max-device-width: 480px)' });

  const week = data.week || 0
  const weekOptions = [0, ...data.weeks] // add 0 for "all"

  if (isMobile) {
    return (
      <React.Fragment>
        <IconButton onClick={() => openFilters(true)} size="large">
          <FilterListIcon style={{color: "white"}} />
        </IconButton>
        <Dialog
          disableEscapeKeyDown
          maxWidth="sm"
          fullWidth={true}
          open={filtersOpen}
          onClose={() => openFilters(false)}>
          <DialogTitle>Filters</DialogTitle>
          <DialogContent style={{paddingTop: 10}}>
            <Stack spacing={2}>
              <LeaguePicker onChange={() => openFilters(false)} mobile={true} />
              <WeekPicker week={week} weeks={weekOptions} onChange={(w) => { openFilters(false); changeWeek(w) }} mobile={true} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => openFilters(false)} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </React.Fragment>
    );
  } else {
    return (
      <React.Fragment>
        <LeaguePicker mobile={false} />
        <WeekPicker week={week} weeks={weekOptions} onChange={(w) => changeWeek(w)} mobile={false} />
      </React.Fragment>
    )
  }
}

export default StatsFilters
