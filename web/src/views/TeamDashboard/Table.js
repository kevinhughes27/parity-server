import React, { Component } from 'react'
import Table from '@material-ui/core/Table'
import TableHead from '@material-ui/core/TableHead'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableRow from '@material-ui/core/TableRow'
import MoneyCell from './MoneyCell'
import TradeModal from './TradeModal'
import { difference } from 'lodash'

export default class TeamTable extends Component {
  state = {
    trading: false,
    playerA: '',
    playerB: ''
  }

  openTradeModal = (player) => {
    this.setState({trading: true, playerA: player.name})
  }

  playerBChanged = (_event, value) => {
    this.setState({playerB: value})
  }

  submitTrade = () => {
    this.props.applyTrade(
      this.state.playerA,
      this.state.playerB
    )

    this.setState({trading: false})
  }

  closeTradeModal = () => {
    this.setState({trading: false})
  }

  render () {
    const { allPlayers, teamPlayers, teamSalary, salaryCap, salaryFloor } = this.props;
    const otherPlayers = difference(allPlayers, teamPlayers)

    return (
      <React.Fragment>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Player</TableCell>
              <TableCell>Salary</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            { teamPlayers.map((player) => {
              return (
                <TableRow key={player.name} hover onClick={() => this.openTradeModal(player)}>
                  <TableCell>{player.name}</TableCell>
                  <TableCell><MoneyCell data={player.salary}/></TableCell>
                </TableRow>
              )
            })}
            <TableRow style={{borderTop: '3px solid grey', lineHeight: 0.5}} hover>
              <TableCell>Current Salary</TableCell>
              <TableCell><MoneyCell data={teamSalary}/></TableCell>
            </TableRow>
            <TableRow hover>
              <TableCell>League Salary Floor</TableCell>
              <TableCell><MoneyCell data={salaryFloor}/></TableCell>
            </TableRow>
            <TableRow hover>
              <TableCell>Team Floor Clearance</TableCell>
              <TableCell><MoneyCell data={teamSalary - salaryFloor}/></TableCell>
            </TableRow>
            <TableRow hover>
              <TableCell>League Salary Cap</TableCell>
              <TableCell><MoneyCell data={salaryCap}/></TableCell>
            </TableRow>
            <TableRow hover>
              <TableCell><b>Team Cap Space</b></TableCell>
              <TableCell><MoneyCell data={salaryCap - teamSalary}/></TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <TradeModal
          open={this.state.trading}
          players={otherPlayers}
          playerA={this.state.playerA}
          playerB={this.state.playerB}
          playerBChanged={this.playerBChanged}
          submitTrade={this.submitTrade}
          onClose={this.closeTradeModal}
        />
      </React.Fragment>
    )
  }
}
