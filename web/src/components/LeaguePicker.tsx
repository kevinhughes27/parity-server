import React from 'react'
import makeStyles from '@mui/styles/makeStyles';
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import { useLeague } from '../hooks/league'
import { leagues } from '../api'
import { map } from 'lodash'

const useStyles = makeStyles((theme) => ({
  selectRoot: {
    color: 'white',
    fontSize: 14,
    minWidth: 80
  },
  icon: {
    color: 'white'
  }
}));

function LeaguePicker(props: { onChange?: (league: string) => void}) {
  const classes = useStyles(props);
  const [league, setLeague] = useLeague();

  const leagueOptions = map(leagues, (league) => {
    return (
      <MenuItem key={league.id} value={league.id}>
        {league.name}
      </MenuItem>
    )
  });

  const onChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setLeague(event.target.value as string);
    props.onChange && props.onChange(event.target.value as string);
  };

  if (leagues.length === 1) return null

  return (
    <div style={{paddingRight: 20}}>
      <Select
        value={league}
        onChange={onChange}
        classes={{ root: classes.selectRoot }}
        disableUnderline
        inputProps={{
          classes: {
            icon: classes.icon,
          }
        }}
      >
        {leagueOptions}
      </Select>
    </div>
  )
}

export default LeaguePicker
