// @flow

import _map from 'lodash/map'
import React, { Component } from 'react'
import {Dropdown, NavItem} from 'react-materialize'

type Props = {
  week: number,
  weeks: Array<any>,
  weekChange: (week: number) => void,
  children?: React$Element<any>
};

class Nav extends Component {
  props: Props

  componentDidMount () {
    window.$('.sidebar-toggle').sideNav({closeOnClick: true})
  }

  weekText (num: number) {
    if (num === 0) {
      return 'All'
    } else {
      return `Week ${num}`
    }
  }

  renderWeeks (weeks: Array<any>) {
    return _map(weeks, (week) => {
      return (
        <NavItem key={week} onClick={() => { this.props.weekChange(week) } }>
          {this.weekText(week)}
        </NavItem>
      )
    })
  }

  render () {
    let week = this.props.week
    let weeks = this.props.weeks

    return (
      <nav>
        <div className="nav-wrapper">
          <a href="#" className="brand-logo center hide-on-small-and-down">Parity 2.0</a>

          <a href="#" data-activates="sidebar" className="left sidebar-toggle">
            <i style={{paddingLeft: 10}} className="material-icons">menu</i>
          </a>

          <ul className="side-nav" id="sidebar">
            {this.props.children}
          </ul>

          <ul className="right">
            <Dropdown trigger={
                <a className="dropdown-button">
                  {this.weekText(week)}
                  <i className="material-icons right">arrow_drop_down</i>
                </a>
              }>
              {this.renderWeeks(weeks)}
            </Dropdown>
          </ul>
        </div>
      </nav>
    )
  }
}

export default Nav
