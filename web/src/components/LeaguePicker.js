import React, { Component } from 'react'
import { withStyles } from '@material-ui/styles'
import MenuItem from '@material-ui/core/MenuItem'
import Select from '@material-ui/core/Select'
import { currentLeague, setLeague, fetchLeagues } from '../api'
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
    loading: true,
    leagues: [],
    league: currentLeague(),
  }

  componentDidMount () {
    return (async () => {
      const leagues = await fetchLeagues()
      this.setState({leagues, loading: false})
    })()
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
    const { league, leagues, loading } = this.state

    if (loading) return null

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
