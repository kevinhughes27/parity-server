import React, { Component } from 'react'

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

import TextField from '@material-ui/core/TextField'
import Autocomplete from '@material-ui/lab/Autocomplete'
import Typography from '@material-ui/core/Typography'

const tradeStyles = {
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  paddingBottom: 20
}

export default class TeamTable extends Component {
  state = {
    playerB: ''
  }

  renderTrades = () => {
    const { trades, removeTrade } = this.props;

    return trades.map((trade, idx) => {
      return (
        <div key={idx} style={tradeStyles}>
          <div style={{flexGrow: 1}}>
            <Typography variant="h6">{trade.playerA.name}</Typography>
            <Typography variant="subtitle2">{trade.playerA.team}</Typography>
          </div>

          <div style={{paddingLeft: 20, paddingRight: 20}}>
            <i className="material-icons" style={{paddingTop: 40}}>swap_horiz</i>
          </div>

          <div style={{flexGrow: 1}}>
            <Typography variant="h6">{trade.playerB.name}</Typography>
            <Typography variant="subtitle2">{trade.playerB.team}</Typography>
          </div>

          <div>
            <a href='# ' style={{cursor: 'pointer'}} onClick={() => {removeTrade(trade) }}>
              <i className="material-icons" style={{paddingTop: 40}}>delete</i>
            </a>
          </div>
        </div>
      )
    })
  }

  render () {
    const { players, playerA, playerB } = this.props;
    const playerNames = players.map(p => p.name)

    return (
      <Dialog
          open={this.props.open}
          onClose={this.props.onClose}
          maxWidth="sm"
          fullWidth
        >
        { this.props.open &&
          <React.Fragment>
            <DialogTitle>Trades</DialogTitle>
            <DialogContent style={{minHeight: 200}}>
              { this.renderTrades() }
              <DialogContentText>
                Trade {playerA.name} for:
              </DialogContentText>
              <Autocomplete
                value={playerB.name}
                options={playerNames}
                onChange={this.props.updateTrade}
                renderInput={params => (
                  <TextField {...params} variant="outlined" fullWidth />
                )}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={this.props.onClose} color="primary">
                Cancel
              </Button>
              <Button onClick={this.props.submitTrade} color="primary">
                Trade
              </Button>
            </DialogActions>
          </React.Fragment>
        }
      </Dialog>
    )
  }
}
