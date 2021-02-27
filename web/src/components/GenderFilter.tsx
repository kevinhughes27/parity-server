import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import MenuItem from '@material-ui/core/MenuItem'
import Select from '@material-ui/core/Select'

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

function GenderFilter(
  props: {filter: string, filterChange: (filter: string) => void}
) {
  const classes = useStyles();
  const { filter, filterChange } = props

  const onChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    filterChange(event.target.value as string);
  };

  return (
    <div style={{paddingRight: 20}}>
      <Select
        value={filter || 'any'}
        onChange={onChange}
        classes={{ root: classes.selectRoot }}
        disableUnderline
        inputProps={{
          classes: {
            icon: classes.icon,
          }
        }}
      >
        <MenuItem value='any'>Gender: Any</MenuItem>
        <MenuItem value={'female'}>Female</MenuItem>
        <MenuItem value={'male'}>Male</MenuItem>
      </Select>
    </div>
  )
}

export default GenderFilter
