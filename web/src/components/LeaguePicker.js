import React, { Component } from 'react'
import { withStyles } from '@material-ui/styles'
import MenuItem from '@material-ui/core/MenuItem'
import Select from '@material-ui/core/Select'
import { currentLeague, setLeague, Leagues } from '../leagues'
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
  state = {
    leagues: Leagues,
    league: currentLeague(),
  }

  renderLeagues (leagues) {
    return map(leagues, (league) => {
      return (
        <MenuItem key={league.id} value={league.id}>
          {league.name}
        </MenuItem>
      )
    })
  }

  onChange = (ev) => {
    const league = ev.target.value
    setLeague(league)
    this.setState({league})
    this.props.onChange(league)
  }

  render () {
    const { classes } = this.props
    const { league, leagues } = this.state

    if (leagues.length === 1) return null

    return (
      <div style={{paddingRight: 20}}>
        <Select
          value={league}
          onChange={this.onChange}
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
