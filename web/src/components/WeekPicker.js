import _map from 'lodash/map'
import React, { Component } from 'react'
import MenuItem from '@material-ui/core/MenuItem'
import FormControl from '@material-ui/core/FormControl'
import Select from '@material-ui/core/Select'

class WeekPicker extends Component {
  weekText (num) {
    if (num === 0) {
      return 'All'
    } else {
      return `Week ${num}`
    }
  }

  renderWeeks (weeks) {
    return _map(weeks, (week) => {
      return (
        <MenuItem key={week} value={week}>
          {this.weekText(week)}
        </MenuItem>
      )
    })
  }

  render () {
    const { week, weeks, onChange } = this.props

    return (
      <FormControl>
        <Select
          value={week}
          onChange={onChange}
        >
          {this.renderWeeks(weeks)}
        </Select>
      </FormControl>
    )
  }
}

export default WeekPicker
