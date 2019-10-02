import _ from 'lodash'
import React, { Component } from 'react'

function renderTeams (teams, change) {
  return teams.map(team => {
    return (
      <li key={team}>
       <a href='# ' onClick={() => { change(team) }}>
          {team}
        </a>
      </li>
    )
  })
}

export default class TeamPicker extends Component {
  componentDidMount() {
    window.$('.dropdown-button').dropdown()
  }

  render () {
    const { team, allPlayers, onChange }  = this.props;
    const teams = _.sortBy(_.uniq(allPlayers.map(p => p.team)));

    return (
      <div>
        <a href='# ' className='dropdown-button btn'
           style={{minWidth: '100%'}}
           data-activates='team-dropdown'>
          {team}
        </a>

        <ul id='team-dropdown' className='dropdown-content'>
          { renderTeams(teams, onChange) }
        </ul>
      </div>
    )
  }
}
