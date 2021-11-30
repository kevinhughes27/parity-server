import React from 'react'
import Button from '@material-ui/core/Button'
import Dialog from '@material-ui/core/Dialog'
import DialogActions from '@material-ui/core/DialogActions'
import DialogContent from '@material-ui/core/DialogContent'
import DialogContentText from '@material-ui/core/DialogContentText'
import DialogTitle from '@material-ui/core/DialogTitle'
import TextField from '@material-ui/core/TextField'
import Autocomplete from '@material-ui/lab/Autocomplete'
import format from 'format-number'
import { sortBy, findIndex } from 'lodash'
import { Player } from '../../api'

interface Trade {
  playerA: Player;
  playerB: Player;
}

interface TradeModalProps {
  players: Player[];
  trades: Trade[];
  playerA: Player;
  playerB: Player;
  overCap: boolean
  open: boolean;
  onClose: () => void;
  updateTrade: (player: Player) => void;
  submitTrade: () => void;
}

export default function TradeModal(props: TradeModalProps) {
  const { players, playerA, playerB } = props;

  const sortedPlayers = sortBy(players, (p) => p.salary)
  const tradeeIdx = findIndex(sortedPlayers, (p) => p.salary >= playerA.salary)
  const lessExpensivePlayers = sortedPlayers.slice(0, tradeeIdx)
  const moreExpensivePlayers = sortedPlayers.slice(tradeeIdx, -1)

  const options = props.overCap
    ? lessExpensivePlayers.reverse().concat(moreExpensivePlayers)
    : moreExpensivePlayers.concat(lessExpensivePlayers.reverse())

  const disabled = (playerB.name === '')

  const optionStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%'
  }

  const updateTrade = (_event: React.ChangeEvent<{}>, value: any) => {
    props.updateTrade(value as Player);
  }

  return (
    <Dialog
        open={props.open}
        onClose={props.onClose}
        maxWidth="sm"
        fullWidth
      >
      { props.open &&
        <React.Fragment>
          <DialogTitle>Trades</DialogTitle>
          <DialogContent style={{minHeight: 200}}>
            <DialogContentText>
              Trade {playerA.name} for:
            </DialogContentText>
            <Autocomplete
              freeSolo
              value={playerB}
              options={options}
              onChange={updateTrade}
              renderInput={params => (
                <TextField {...params} variant="outlined" fullWidth />
              )}
              getOptionLabel={option => option.name}
              renderOption={option => {
                const diff = option.salary - playerA.salary
                const color = diff >= 0 ? '#00e676' : '#f44336'
                const prefix = diff >= 0 ? '+ $' : '- $'
                const value = Math.abs(diff)

                return (
                  <span style={optionStyle}>
                    <span>{option.name}</span>
                    <span style={{color, paddingRight: 30}}>
                      {format({prefix})(value)}
                    </span>
                  </span>
                )
             }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={props.onClose} color="primary">
              Cancel
            </Button>
            <Button onClick={props.submitTrade} disabled={disabled} color="primary">
              Trade
            </Button>
          </DialogActions>
        </React.Fragment>
      }
    </Dialog>
  )
}
