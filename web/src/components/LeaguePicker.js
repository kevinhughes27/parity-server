import React, { Component } from 'react'
import { withStyles } from '@material-ui/styles'
import MenuItem from '@material-ui/core/MenuItem'
import Select from '@material-ui/core/Select'
import { map } from 'lodash'

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

class LeaguePicker extends Component {
  renderLeagues (leagues) {
    return map(leagues, (league) => {
      return (
        <MenuItem key={league.id} value={league.id}>
          {league.name}
        </MenuItem>
      )
    })
  }

  render () {
    const { classes, league, leagues, onChange } = this.props

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
          {this.renderLeagues(leagues)}
        </Select>
      </div>
    )
  }
}

export default withStyles(styles)(LeaguePicker)
