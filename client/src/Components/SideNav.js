import React, { Component } from 'react'
import { Link } from 'react-router'

class SideNav extends Component {
  render () {
    let forumUrl = 'https://www.ocua.ca/forum/33'
    let podcastUrl = 'https://soundcloud.com/user-640277634/sets/parity-podcast-season-2/s-Hka7a'
    let spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1F46H8ZRGP8Jzj1zSW0PT8HerBZ_BlHI5T48A2vp34r0/edit?usp=sharing'
    let srcUrl = 'https://github.com/kevinhughes27/parity-server'
    let volunteerUrl = 'https://docs.google.com/spreadsheets/d/1lunhlXMe5_sefD6Dy9OCreQxMtEi2mzDrmHLhBD7Elo/edit?usp=sharing'

    return (
      <div>
        <li>
          <div className='userView'>
            <img src='logo.png' style={{width: 240}} alt="logo"/>
          </div>
        </li>

        <li><Link to='/'>Raw Stats</Link></li>
        <li><Link to='/leaderboards'>Leaderboards</Link></li>
        <li><Link to='/compare_players'>Compare Players</Link></li>
        <li><Link to='/team_dashboard'>Team Dashboard</Link></li>
        <li><Link to='/trade_simulator'>Trade Simulator</Link></li>

        <li><div className='divider'></div></li>

        <li><a href={volunteerUrl} target='_blank'>Volunteer</a></li>
        <li><a href={forumUrl} target='_blank'>Forum</a></li>
        <li><a href={podcastUrl} target='_blank'>Podcast</a></li>
        <li><a href={spreadsheetUrl} target='_blank'>Spreadsheets</a></li>
        <li><a href={srcUrl} target='_blank'>Source Code</a></li>
      </div>
    )
  }
}

export default SideNav
