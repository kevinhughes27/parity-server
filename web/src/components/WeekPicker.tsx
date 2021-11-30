import React from 'react'
import MenuItem from '@mui/material/MenuItem'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import { map } from 'lodash'

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
      value={week.toString()}
      onChange={onChange}
      disableUnderline
    >
      {weekOptions}
    </Select>
  )
}

export default WeekPicker
