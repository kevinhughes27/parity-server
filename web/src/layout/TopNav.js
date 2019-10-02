import React, { Component } from 'react'
import SideNav from './SideNav'

class TopNav extends Component {
  componentDidMount () {
    window.$('.sidebar-toggle').sideNav({closeOnClick: true})
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
            <SideNav/>
          </ul>

          {this.props.children}
        </div>
      </nav>
    )
  }
}

export default TopNav
