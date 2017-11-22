// @flow

import React, { Component } from 'react'
import WeekPicker from './WeekPicker'

type Props = {
  week: number,
  weeks: Array<any>,
  weekChange: (week: number) => void,
  children?: React$Element<any>
};

class TopNav extends Component {
  props: Props

  componentDidMount () {
    window.$('.sidebar-toggle').sideNav({closeOnClick: true})
  }

  renderRightNav () {
    const { week, weeks, weekChange } = this.props

    if (week) {
      return (
        <ul className="right">
          <WeekPicker week={week} weeks={weeks} onChange={weekChange} />
        </ul>
      )
    }
  }

  render () {
    return (
      <nav>
        <div className="nav-wrapper">
          <a href="/" className="brand-logo center hide-on-small-and-down">Parity 2.0</a>

          <a href="#!sidebar-toggle" data-activates="sidebar" className="left sidebar-toggle">
            <i style={{paddingLeft: 10}} className="material-icons">menu</i>
          </a>

          <ul className="side-nav" id="sidebar">
            {this.props.children}
          </ul>

          { this.renderRightNav() }
        </div>
      </nav>
    )
  }
}

export default TopNav
