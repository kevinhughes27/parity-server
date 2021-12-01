import React from 'react'
import makeStyles from '@mui/styles/makeStyles';
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import capitalize from 'capitalize'
import format from 'format-number'
import { map, keys, sortBy } from 'lodash'
import { Stats, StatLine } from '../../api'

const useStyles = makeStyles((theme) => ({
  paper: {
    minWidth: 300,
    margin: 20
  },
  title: {
    paddingLeft: 15,
    paddingTop: 10
  }
}));

function topPlayers(stats: StatLine[], stat: string, num: number) {
  return sortBy(stats, (p) => { return -p[stat] }).slice(0, num)
}

function Card(props: {stat: string, stats: Stats, money?: boolean}) {
  const classes = useStyles();
  const { stat, stats, money } = props

  const statsArray = map(keys(stats), (k) => {
    return {...stats[k], name: k}
  })

  const players = topPlayers(statsArray, stat, 10)
  const statTitle = capitalize.words(stat.replace(/_/g, ' '))

  return (
    <Paper key={stat} className={classes.paper}>
      <Typography variant="h5" component="h3" gutterBottom className={classes.title}>
        {statTitle}
      </Typography>
      <Table size="small">
        <TableBody>
          { map(players, (player) => {
            let value = player[stat]
            if (money) {
              value = format({prefix: '$'})(value as number)
            }

            return (
              <TableRow key={player['name']} hover>
                <TableCell>{player['name']}</TableCell>
                <TableCell>{value}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Paper>
  )
}

export default Card
