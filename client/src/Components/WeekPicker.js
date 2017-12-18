import _map from 'lodash/map'
import React, { Component } from 'react'
import { Dropdown, NavItem } from 'react-materialize'

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
        <NavItem key={week} onClick={() => { this.props.onChange(week) } }>
          {this.weekText(week)}
        </NavItem>
      )
    })
  }

  render () {
    const { week, weeks } = this.props

    return (
      <Dropdown trigger={
          <a className="dropdown-button">
            {this.weekText(week)}
            <i className="material-icons right">arrow_drop_down</i>
          </a>
        }>
        {this.renderWeeks(weeks)}
      </Dropdown>
    )
  }
}

export default WeekPicker
