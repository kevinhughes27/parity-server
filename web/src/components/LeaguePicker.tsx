import React from 'react'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import { styled } from '@mui/material/styles'
import InputBase from '@mui/material/InputBase'
import { useLeague } from '../hooks/league'
import { leagues } from '../api'
import { map } from 'lodash'

const LeagueInput = styled(InputBase)(() => ({
  '& .MuiInputBase-input': {
    color: 'white'
  },
  '& .MuiSelect-icon': {
    color: 'white'
  }
}));

function LeaguePicker(
  props: {
    onChange?: (league: string) => void;
    mobile: boolean
  }
) {
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

  if (props.mobile) {
    return (
      <FormControl fullWidth>
        <InputLabel id="league-picker-label">League</InputLabel>
        <Select
          labelId="league-picker-label"
          id="league-picker"
          value={league}
          label="League"
          onChange={onChange}
        >
          {leagueOptions}
        </Select>
      </FormControl>
    )
  } else {
    return (
      <div style={{paddingRight: 20}}>
        <Select
          variant='standard'
          value={league}
          onChange={onChange}
          input={<LeagueInput />}
        >
          {leagueOptions}
        </Select>
      </div>
    )
  }
}

export default LeaguePicker
