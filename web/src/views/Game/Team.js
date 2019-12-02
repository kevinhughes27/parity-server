import React, { Component } from 'react'
import Typography from '@material-ui/core/Typography'
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
    const { teamName, score, players, stats, points, colors, statMaxes } = this.props
    const { tab } = this.state

    return (
      <React.Fragment>
        <Typography variant="h5" className={"game-title"} gutterBottom={true}>
          {teamName}
        </Typography>
        <div className={"game-tabs"}>
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
            <Chart stats={stats} statMaxes={statMaxes} colors={colors} />
          }
        </div>
      </React.Fragment>
    )
  }
}
