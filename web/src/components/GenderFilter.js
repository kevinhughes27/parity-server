import React, { Component } from 'react'
import { withStyles } from '@material-ui/styles'
import MenuItem from '@material-ui/core/MenuItem'
import Select from '@material-ui/core/Select'

const styles = {
  selectRoot: {
    color: 'white',
    fontSize: 14,
    minWidth: 80
  },
  icon: {
    color: 'white'
  }
}

class GenderFilter extends Component {
  render () {
    const { classes, filter, onChange } = this.props

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
}

export default withStyles(styles)(GenderFilter)
