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

function GenderFilter(props) {
  const classes = useStyles();
  const { filter, onChange } = props

  return (
    <div style={{paddingRight: 20}}>
      <Select
        value={filter || 'any'}
        onChange={onChange}
        classes={{ root: classes.selectRoot }}
        className={classes.select}
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
