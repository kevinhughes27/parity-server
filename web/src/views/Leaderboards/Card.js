import React, { Component } from 'react'
import { withStyles } from '@material-ui/styles'
import Paper from '@material-ui/core/Paper'
import Typography from '@material-ui/core/Typography'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableRow from '@material-ui/core/TableRow'
import capitalize from 'capitalize'
import { map, keys, sortBy } from 'lodash'

const styles = {
  paper: {
    minWidth: 300,
    margin: 20
  },
  title: {
    paddingLeft: 15,
    paddingTop: 10
  }
}

function topPlayers(stats, stat, num) {
  return sortBy(stats, (p) => { return -p[stat] }).slice(0, num)
}

class Card extends Component {
  render () {
    const { classes, stat, stats } = this.props

    const statsArray = map(keys(stats), (k) => {
      return { name: k, ...stats[k] }
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
              return (
                <TableRow key={player['name']} hover>
                  <TableCell>{player['name']}</TableCell>
                  <TableCell>{player[stat]}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Paper>
    )
  }
}

export default withStyles(styles)(Card)
