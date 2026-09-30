import React from 'react';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { styled } from '@mui/material/styles';
import InputBase from '@mui/material/InputBase';
import { useLeague } from '../hooks/league';
import { leagues } from '../api';
import { map } from 'lodash';

const LeagueInput = styled(InputBase)(({ theme }) => ({
  '& .MuiInputBase-input': {
    color: theme.palette.common.white,
  },
  '& .MuiSelect-icon': {
    color: theme.palette.common.white,
  },
}));

interface LeaguePickerProps {
  onChange?: (league: string) => void;
  mobile: boolean;
}

function LeaguePicker({ onChange, mobile }: LeaguePickerProps) {
  const [league, setLeague] = useLeague();

  const leagueOptions = map(leagues, league => {
    return (
      <MenuItem key={league.id} value={league.id}>
        {league.name}
      </MenuItem>
    );
  });

  const handleChange = (event: SelectChangeEvent) => {
    setLeague(event.target.value as string);
    onChange?.(event.target.value as string);
  };

  if (leagues.length === 1) return null;

  if (mobile) {
    return (
      <FormControl fullWidth>
        <InputLabel id="league-picker-label">League</InputLabel>
        <Select
          labelId="league-picker-label"
          id="league-picker"
          value={league}
          label="League"
          onChange={handleChange}
        >
          {leagueOptions}
        </Select>
      </FormControl>
    );
  } else {
    return (
      <div style={{ paddingRight: 20 }}>
        <Select variant="standard" value={league} onChange={handleChange} input={<LeagueInput />}>
          {leagueOptions}
        </Select>
      </div>
    );
  }
}

export default LeaguePicker;
