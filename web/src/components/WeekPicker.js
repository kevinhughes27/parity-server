import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import MenuItem from '@material-ui/core/MenuItem'
import Select from '@material-ui/core/Select'
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

function WeekPicker(props) {
  const classes = useStyles()
  const { week, weeks, onChange } = props

  const weekText = (num) => {
    if (num === 0) {
      return 'All'
    } else {
      return `Week ${num}`
    }
  }

  const renderWeeks = (weeks) => {
    return map(weeks, (week) => {
      return (
        <MenuItem key={week} value={week}>
          {weekText(week)}
        </MenuItem>
      )
    })
  }

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
      {renderWeeks(weeks)}
    </Select>
  )
}

export default WeekPicker
