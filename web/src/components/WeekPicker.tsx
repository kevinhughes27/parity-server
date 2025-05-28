import React from 'react'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import { styled } from '@mui/material/styles'
import InputBase from '@mui/material/InputBase'
import { map } from 'lodash'

const WeekInput = styled(InputBase)(({ theme }) => ({
  '& .MuiInputBase-input': {
    color: theme.palette.common.white
  },
  '& .MuiSelect-icon': {
    color: theme.palette.common.white
  }
}));

interface WeekPickerProps {
  week: number;
  weeks: number[];
  onChange: (week: number) => void;
  mobile: boolean;
}

function WeekPicker({ week, weeks, onChange, mobile }: WeekPickerProps) {
  const handleChange = (event: SelectChangeEvent) => {
    onChange(parseInt(event.target.value));
  };

  const weekText = (num: number) => {
    if (num === 0) {
      return 'All'
    } else {
      return `Week ${num}`
    }
  };

  const weekOptions = map(weeks, (week) => {
    return (
      <MenuItem key={week} value={week}>
        {weekText(week)}
      </MenuItem>
    )
  });

  if (mobile) {
    return (
      <FormControl fullWidth>
        <InputLabel id="week-picker-label">Week</InputLabel>
        <Select
          labelId="week-picker-label"
          id="week-picker"
          value={week.toString()}
          label="Week"
          onChange={handleChange}>
          {weekOptions}
        </Select>
      </FormControl>
    );
  } else {
    return (
      <Select
        variant='standard'
        value={week.toString()}
        onChange={handleChange}
        input={<WeekInput/>}
      >
        {weekOptions}
      </Select>
    )
  }
}

export default WeekPicker
