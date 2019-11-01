import React, { Component } from 'react'
import { withStyles } from '@material-ui/styles'
import MenuItem from '@material-ui/core/MenuItem'
import Select from '@material-ui/core/Select'
import { map } from 'lodash'

const styles = {
  selectRoot: {
    color: 'white',
    fontSize: 14,
    minWidth: 80
  },
  icon: {
    color: 'white'
  }
}

class WeekPicker extends Component {
  weekText (num) {
    if (num === 0) {
      return 'All'
    } else {
      return `Week ${num}`
    }
  }

  renderWeeks (weeks) {
    return map(weeks, (week) => {
      return (
        <MenuItem key={week} value={week}>
          {this.weekText(week)}
        </MenuItem>
      )
    })
  }

  render () {
    const { classes, week, weeks, onChange } = this.props

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
          {this.renderWeeks(weeks)}
        </Select>
    )
  }
}

export default withStyles(styles)(WeekPicker)
