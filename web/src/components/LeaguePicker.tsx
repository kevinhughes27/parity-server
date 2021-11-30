import React from 'react'
import MenuItem from '@mui/material/MenuItem'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import { useLeague } from '../hooks/league'
import { leagues } from '../api'
import { map } from 'lodash'

function LeaguePicker(props: { onChange?: (league: string) => void}) {
  const [league, setLeague] = useLeague();

  const leagueOptions = map(leagues, (league) => {
    return (
      <MenuItem key={league.id} value={league.id}>
        {league.name}
      </MenuItem>
    )
  });

  const onChange = (event: SelectChangeEvent) => {
    setLeague(event.target.value as string);
    props.onChange && props.onChange(event.target.value as string);
  };

  if (leagues.length === 1) return null

  return (
    <div style={{paddingRight: 20}}>
      <Select
        value={league}
        onChange={onChange}
        disableUnderline
      >
        {leagueOptions}
      </Select>
    </div>
  )
}

export default LeaguePicker
