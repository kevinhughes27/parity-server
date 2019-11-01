import _ from 'lodash'
import React, { Component } from 'react'
import Paper from '@material-ui/core/Paper'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableRow from '@material-ui/core/TableRow'
import Roster from './Roster'

export default class Team extends Component {
  render () {
    const { score, players, game } = this.props

    const events = _.flatten(_.map(game.points, (p) => p.events))
    const teamEvents = _.filter(events, (ev) => {
      return _.includes(players, ev.firstActor)
    })

    const defenseEvents = _.filter(teamEvents, (ev) => ev.type === 'DEFENSE')
    const passEvents = _.filter(teamEvents, (ev) => ev.type === 'PASS')
    const throwAwayEvents = _.filter(teamEvents, (ev) => ev.type === 'THROWAWAY')
    const dropEvents = _.filter(teamEvents, (ev) => ev.type === 'DROP')

    return (
      <React.Fragment>
        <Paper style={{marginBottom: 20}}>
          <Table size="small">
            <TableBody>
              <TableRow hover>
                <TableCell>
                  <strong>Points</strong>
                </TableCell>
                <TableCell>
                  <strong>{score}</strong>
                </TableCell>
              </TableRow>

              { this.renderStat('Defense', defenseEvents.length) }
              { this.renderStat('Completions', passEvents.length) }
              { this.renderStat('Throw Aways', throwAwayEvents.length) }
              { this.renderStat('Drops', dropEvents.length) }
            </TableBody>
          </Table>
        </Paper>

        <Paper>
          <Roster players={players} />
        </Paper>
      </React.Fragment>
    )
  }

  renderStat(name, value) {
    return (
      <TableRow hover>
        <TableCell>
          {name}
        </TableCell>
        <TableCell>
          {value}
        </TableCell>
      </TableRow>
    )
  }
}
