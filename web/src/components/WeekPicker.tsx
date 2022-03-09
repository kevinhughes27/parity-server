import React from 'react'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import { styled } from '@mui/material/styles'
import InputBase from '@mui/material/InputBase'
import { map } from 'lodash'

const WeekInput = styled(InputBase)(() => ({
  '& .MuiInputBase-input': {
    color: 'white'
  },
  '& .MuiSelect-icon': {
    color: 'white'
  }
}));

function WeekPicker(
  props: {
    week: number;
    weeks: number[];
    onChange: (week: number) => void;
    mobile: boolean
  }
) {
  const { week, weeks, mobile } = props

  const onChange = (event: SelectChangeEvent) => {
    props.onChange(parseInt(event.target.value));
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
          onChange={onChange}
        >
          {weekOptions}
        </Select>
      </FormControl>
    )
  } else {
    return (
      <Select
        variant='standard'
        value={week.toString()}
        onChange={onChange}
        disableUnderline
        input={<WeekInput/>}
      >
        {weekOptions}
      </Select>
    )
  }
}

export default WeekPicker
