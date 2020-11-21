import React, { useState } from 'react'
import Typography from '@material-ui/core/Typography'
import Paper from '@material-ui/core/Paper'
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'
import Roster from './Roster'
import TeamStats from './TeamStats'
import Chart from './Chart'

export default function Team(props) {
  const { teamName, score, players, stats, points, colors, statMaxes } = props;
  const [tab, setTab] = useState(0);

  return (
    <React.Fragment>
      <Typography variant="h5" className={"game-title"} gutterBottom={true}>
        {teamName}
      </Typography>
      <div className={"game-tabs"}>
        <Tabs
          value={tab}
          onChange={(_event, tab) => setTab(tab)}
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
