import React from 'react';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { uniq, sortBy } from 'lodash';

interface TeamPickerProps {
  team: string;
  allPlayers: { name: string; team: string }[];
  onChange: (team: string) => void;
}

export default function TeamPicker(props: TeamPickerProps) {
  const { team, allPlayers } = props;
  const teams = sortBy(uniq(allPlayers.map(p => p.team)));

  const onChange = (event: SelectChangeEvent) => {
    props.onChange(event.target.value as string);
  };

  const teamOptions = teams.map(team => {
    return (
      <MenuItem key={team} value={team}>
        {team}
      </MenuItem>
    );
  });

  const styles = {
    width: '100%',
    marginBottom: 10,
  };

  return (
    <Select value={team} onChange={onChange} variant="filled" margin="dense" style={styles}>
      {teamOptions}
    </Select>
  );
}
