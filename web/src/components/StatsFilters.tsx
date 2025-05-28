import React, { useState } from 'react'
import LeaguePicker from './LeaguePicker'
import WeekPicker from './WeekPicker'
import { IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'
import Stack from '@mui/material/Stack'
import FilterListIcon from '@mui/icons-material/FilterList'
import { useMediaQuery } from 'react-responsive'

interface StatsFiltersProps {
  data: {
    week?: number;
    weeks: number[];
  };
  changeWeek: (week: number) => void;
}

const StatsFilters = ({ data, changeWeek }: StatsFiltersProps) => {
  const [filtersOpen, setFiltersOpen] = useState(false)

  const isMobile = useMediaQuery({ query: '(max-device-width: 480px)' });

  const week = data.week || 0
  const weekOptions = [0, ...data.weeks] // add 0 for "all"

  if (isMobile) {
    return (
      <React.Fragment>
        <IconButton onClick={() => setFiltersOpen(true)} size="large">
          <FilterListIcon style={{color: "white"}} />
        </IconButton>
        <Dialog
          disableEscapeKeyDown
          maxWidth="sm"
          fullWidth={true}
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}>
          <DialogTitle>Filters</DialogTitle>
          <DialogContent style={{paddingTop: 10}}>
            <Stack spacing={2}>
              <LeaguePicker onChange={() => setFiltersOpen(false)} mobile={true} />
              <WeekPicker week={week} weeks={weekOptions} onChange={(w) => { setFiltersOpen(false); changeWeek(w) }} mobile={true} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFiltersOpen(false)} color="primary">
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
        <WeekPicker week={week} weeks={weekOptions} onChange={changeWeek} mobile={false} />
      </React.Fragment>
    )
  }
}

export default StatsFilters
