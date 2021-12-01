import React from 'react'
import MenuItem from '@mui/material/MenuItem'
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
    onChange: (week: number) => void
  }
) {
  const { week, weeks } = props

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

  return (
    <Select
      variant='standard'
      value={week.toString()}
      onChange={onChange}
      disableUnderline
      input={<WeekInput />}
    >
      {weekOptions}
    </Select>
  )
}

export default WeekPicker
