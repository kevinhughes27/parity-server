import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { Collapsible, CollapsibleItem } from 'react-materialize'

class SideNav extends Component {
  render () {
    let forumUrl = 'https://www.ocua.ca/forum/33'
    let podcastUrl = 'https://soundcloud.com/user-640277634/sets/parity-podcast-season-4/s-KvCFa'
    let srcUrl = 'https://github.com/kevinhughes27/parity-server'
    let volunteerUrl = 'https://docs.google.com/spreadsheets/d/1lunhlXMe5_sefD6Dy9OCreQxMtEi2mzDrmHLhBD7Elo/edit?usp=sharing'

    let spreadsheets = [
      {name: '2019-2020', url: 'https://docs.google.com/spreadsheets/d/1ijmSykLC4LM0vfvnKyAqymp7wZRXWkAeejNvBgukOj0'},
      {name: '2018-2019', url: 'https://docs.google.com/spreadsheets/d/1KTFwydcZrVoHqEGej1uyZk8rO58RDr_1tUMIh08yZN8' },
      // {name: '2017-2018', url: 'https://docs.google.com/spreadsheets/d/1F46H8ZRGP8Jzj1zSW0PT8HerBZ_BlHI5T48A2vp34r0' },
    ];

    return (
      <div>
        <li>
          <div className='userView'>
            <img src='/logo.png' style={{width: 240}} alt="logo"/>
          </div>
        </li>

        <li><Link to='/games'>Games</Link></li>
        <li><Link to='/'>Player Stats</Link></li>
        <li><Link to='/leaderboards'>Leaderboards</Link></li>
        <li><Link to='/compare_players'>Compare Players</Link></li>
        <li><Link to='/team_dashboard'>Team Dashboard</Link></li>
        <li><Link to='/trade_simulator'>Trade Simulator</Link></li>

        <li><div className='divider'></div></li>

        <li><a href={volunteerUrl} target="_blank" rel="noopener noreferrer">Volunteer</a></li>
        <li><a href={forumUrl} target="_blank" rel="noopener noreferrer">Forum</a></li>
        <li><a href={podcastUrl} target="_blank" rel="noopener noreferrer">Podcast</a></li>

        <li>
          <Collapsible>
            <CollapsibleItem header="Spreadsheets">
              <ul style={{marginTop: -30, marginLeft: -15, marginBottom: -30}}>
                {spreadsheets.map(sheet => <li key={sheet.name}><a href={sheet.url} target="_blank" rel="noopener noreferrer">{sheet.name}</a></li>)}
              </ul>
            </CollapsibleItem>
          </Collapsible>
        </li>

        <li><a href={srcUrl} target="_blank" rel="noopener noreferrer">Source Code</a></li>
      </div>
    )
  }
}

export default SideNav
