import React from 'react'
import MenuItem from '@material-ui/core/MenuItem'
import Select from '@material-ui/core/Select'
import { uniq, sortBy } from 'lodash'

export default function TeamPicker(props) {
  const { team, allPlayers, onChange }  = props;
  const teams = sortBy(uniq(allPlayers.map(p => p.team)));

  const renderTeams = (teams, change) => {
    return teams.map(team => {
      return (
        <MenuItem key={team} value={team}>
          {team}
        </MenuItem>
      )
    })
  }

  const styles = {
    width: '100%',
    marginBottom: 10
  }

  return (
    <Select
      value={team}
      onChange={onChange}
      variant='filled'
      margin='dense'
      style={styles}
    >
      { renderTeams(teams, onChange) }
    </Select>
    )
}
