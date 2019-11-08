import React, { Component } from 'react'
import Table from '@material-ui/core/Table'
import TableHead from '@material-ui/core/TableHead'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableRow from '@material-ui/core/TableRow'
import MoneyCell from './MoneyCell'

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

import PlayerSelect from '../../components/PlayerSelect';

export default class TeamTable extends Component {
  constructor (props) {
    super(props)

    this.state = {
      playerA: '',
      playerB: '',
    }
  }

  openTradeModal = (player) => {
    this.setState({open: true, playerA: player.name})
  }

  playerBChanged (value) {
    this.setState({playerB: value})
  }

  submitTrade = () => {
    this.props.applyTrade(
      this.state.playerA,
      this.state.playerB
    )

    this.setState({open: false})
  }

  closeTradeModal = () => {
    this.setState({open: false})
  }

  render () {
    const { allPlayers, teamPlayers, teamSalary, salaryCap, salaryFloor } = this.props;
    const playerNames = allPlayers.map(p => p.name)

    return (
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

        <Dialog
          open={this.state.open}
          onClose={this.closeTradeModal}
          maxWidth="sm"
          fullWidth
        >
          { this.state.open &&
            <React.Fragment>
              <DialogTitle>Trade {this.state.playerA} </DialogTitle>
              <DialogContent style={{minHeight: 300}}>
                <DialogContentText>
                  Trade {this.state.playerA} for:
                </DialogContentText>
                <PlayerSelect
                  value={this.state.playerB}
                  players={playerNames}
                  onChange={(event) => this.playerBChanged(event)}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={this.closeTradeModal} color="primary">
                  Cancel
                </Button>
                <Button onClick={this.submitTrade} color="primary">
                  Trade
                </Button>
              </DialogActions>
            </React.Fragment>
          }
        </Dialog>
      </Table>
    )
  }
}
