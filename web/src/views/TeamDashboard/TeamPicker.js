import React, { Component } from 'react'
import MenuItem from '@material-ui/core/MenuItem'
import Select from '@material-ui/core/Select'
import { uniq, sortBy } from 'lodash'

function renderTeams (teams, change) {
  return teams.map(team => {
    return (
      <MenuItem key={team} value={team}>
        {team}
      </MenuItem>
    )
  })
}

export default class TeamPicker extends Component {
  render () {
    const { team, allPlayers, onChange }  = this.props;
    const teams = sortBy(uniq(allPlayers.map(p => p.team)));

    return (
      <Select
        value={team}
        onChange={onChange}
      >
        { renderTeams(teams, onChange) }
      </Select>
    )
  }
}
