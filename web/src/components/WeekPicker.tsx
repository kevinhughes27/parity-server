import React from 'react'
import makeStyles from '@mui/styles/makeStyles';
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import { map } from 'lodash'

const useStyles = makeStyles((theme) => ({
  selectRoot: {
    color: 'white',
    fontSize: 14,
    minWidth: 80
  },
  icon: {
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
  const classes = useStyles(props)
  const { week, weeks } = props

  const onChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    props.onChange(event.target.value as number);
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
      value={week}
      onChange={onChange}
      classes={{ root: classes.selectRoot }}
      disableUnderline
      inputProps={{
        classes: {
          icon: classes.icon,
        }
      }}
    >
      {weekOptions}
    </Select>
  )
}

export default WeekPicker
