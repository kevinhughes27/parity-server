import React, { Component } from 'react'
import { Dropdown, NavItem } from 'react-materialize'
import capitalize from 'capitalize'

export default class GenderFilter extends Component {
  filterOption (display, filter) {
    return (
      <NavItem key={filter} onClick={() => { this.props.onChange(filter)}}>
        {display}
      </NavItem>
    )
  }

  render () {
    const { filter } = this.props;
    return (
      <Dropdown trigger={
        <a href='# ' className='dropdown-button'>
          Gender: {capitalize(filter) || 'Any'}
          <i className='material-icons right'>arrow_drop_down</i>
        </a>
      }>
        {this.filterOption('Any', '')}
        {this.filterOption('Female', 'female')}
        {this.filterOption('Male', 'male')}
      </Dropdown>
    )
  }
}
