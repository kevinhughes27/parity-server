import React, { useState, ReactNode } from 'react'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Roster from './Roster'
import TeamStats from './TeamStats'
import Chart from './Chart'
import { Stats, Point } from '../../api'

interface TeamProps {
  teamName: ReactNode;
  score: number;
  players: string[];
  stats: Stats;
  points: Point[];
  colors: string[];
  statMaxes: Record<string, number>;
}

export default function Team(props: TeamProps) {
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
