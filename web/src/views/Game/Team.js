import React, { Component } from 'react'
import Paper from '@material-ui/core/Paper'
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'
import Roster from './Roster'
import TeamStats from './TeamStats'
import Chart from './Chart'

export default class Team extends Component {
  state = {
    tab: 0
  }

  tabChanged = (_event, tab) => {
    this.setState({tab})
  }

  render () {
    const { score, players, stats, points } = this.props
    const { tab } = this.state

    return (
      <div style={{height: 480}}>
        <Tabs
          value={tab}
          onChange={this.tabChanged}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Roster" />
          <Tab label="Team Stats" />
          <Tab label="Graphs" />
        </Tabs>
        { tab === 0 &&
          <Paper>
            <Roster players={players} />
          </Paper>
        }
        { tab === 1 &&
          <TeamStats
          score={score}
          players={players}
          points={points} />
        }
        { tab === 2 &&
          <Chart stats={stats} />
        }
      </div>
    )
  }
}
