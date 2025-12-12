import React, { useState, useEffect, useMemo } from 'react';
import { Bookkeeper, GameState } from './bookkeeper';
import PointDisplay from './PointDisplay';
import ActionBar from './ActionBar';
import { StoredPlayer } from './db';
import {
  Box,
  Button,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';

const SelectLines: React.FC<{ bookkeeper: Bookkeeper }> = ({ bookkeeper }) => {
  // I'm coming for this odditity here
  const currentGameState = bookkeeper.gameState();
  const isEditingLine =
    currentGameState === GameState.EditingLines || bookkeeper.activePoint !== null;
  const lastPlayedLine = bookkeeper.lastPlayedLine;
  const lineSize = bookkeeper.league.lineSize;

  // Memoize rosters to prevent infinite re-renders
  const homeRoster = useMemo(() => bookkeeper.getHomeRoster(), [bookkeeper]);
  const awayRoster = useMemo(() => bookkeeper.getAwayRoster(), [bookkeeper]);

  const [selectedHomePlayers, setSelectedHomePlayers] = useState<string[]>([]);
  const [selectedAwayPlayers, setSelectedAwayPlayers] = useState<string[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogMessage, setConfirmDialogMessage] = useState('');
  const [pendingLineSubmission, setPendingLineSubmission] = useState<{
    newHomePlayers: string[];
    newAwayPlayers: string[];
  } | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  const showSnackbar = (message: string) => {
    setSnackbar({ open: true, message });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getRatioCounts = (playerNames: string[]) => {
    const open = playerNames.filter(name => {
      const player = [...homeRoster, ...awayRoster].find(p => p.name === name);
      return player?.is_open ?? true;
    }).length;
    const women = playerNames.length - open;
    return { open, women };
  };

  const checkRatioCompliance = (playerNames: string[]) => {
    const { open, women } = getRatioCounts(playerNames);
    const ratio = bookkeeper.getLeagueRatio();
    return open === ratio.open && women === ratio.women;
  };

  const getRatioWarnings = () => {
    const warnings: string[] = [];

    if (selectedHomePlayers.length === lineSize) {
      const homeCompliant = checkRatioCompliance(selectedHomePlayers);
      if (!homeCompliant) {
        const ratio = bookkeeper.getLeagueRatio();
        const { open, women } = getRatioCounts(selectedHomePlayers);
        warnings.push(
          `${bookkeeper.getHomeTeamName()}: ${open} ON2, ${women} WN2 (expected ${ratio.open} ON2, ${ratio.women} WN2)`
        );
      }
    }

    if (selectedAwayPlayers.length === lineSize) {
      const awayCompliant = checkRatioCompliance(selectedAwayPlayers);
      if (!awayCompliant) {
        const { open, women } = getRatioCounts(selectedAwayPlayers);
        const ratio = bookkeeper.getLeagueRatio();
        warnings.push(
          `${bookkeeper.getAwayTeamName()}: ${open} ON2, ${women} WN2 (expected ${ratio.open} ON2, ${ratio.women} WN2)`
        );
      }
    }

    return warnings;
  };

  const getIncompleteLinesWarning = () => {
    const warnings: string[] = [];

    if (selectedHomePlayers.length !== lineSize) {
      warnings.push(
        `${bookkeeper.getHomeTeamName()}: ${selectedHomePlayers.length}/${lineSize} players selected`
      );
    }

    if (selectedAwayPlayers.length !== lineSize) {
      warnings.push(
        `${bookkeeper.getAwayTeamName()}: ${selectedAwayPlayers.length}/${lineSize} players selected`
      );
    }

    return warnings;
  };

  useEffect(() => {
    if (isEditingLine && bookkeeper.homePlayers && bookkeeper.awayPlayers) {
      setSelectedHomePlayers(bookkeeper.homePlayers);
      setSelectedAwayPlayers(bookkeeper.awayPlayers);
    } else if (lastPlayedLine) {
      // pre-select players not on the last played line.
      setSelectedHomePlayers(
        homeRoster.filter(p => !lastPlayedLine.home.includes(p.name)).map(p => p.name)
      );
      setSelectedAwayPlayers(
        awayRoster.filter(p => !lastPlayedLine.away.includes(p.name)).map(p => p.name)
      );
    } else {
      setSelectedHomePlayers([]);
      setSelectedAwayPlayers([]);
    }
  }, [
    isEditingLine,
    lastPlayedLine,
    bookkeeper.homePlayers,
    bookkeeper.awayPlayers,
    homeRoster,
    awayRoster,
  ]);

  const togglePlayerSelection = (playerName: string, isHomeTeam: boolean) => {
    const currentSelection = isHomeTeam ? selectedHomePlayers : selectedAwayPlayers;
    const setter = isHomeTeam ? setSelectedHomePlayers : setSelectedAwayPlayers;
    const teamName = isHomeTeam ? bookkeeper.getHomeTeamName() : bookkeeper.getAwayTeamName();

    let newSelection;
    if (currentSelection.includes(playerName)) {
      newSelection = currentSelection.filter(p => p !== playerName);
    } else {
      if (currentSelection.length < lineSize) {
        newSelection = [...currentSelection, playerName];
      } else {
        showSnackbar(`Cannot select more than ${lineSize} players for ${teamName}.`);
        return;
      }
    }
    setter(newSelection.sort((a, b) => a.localeCompare(b)));
  };

  const submitLineSelection = async (newHomePlayers: string[], newAwayPlayers: string[]) => {
    if (currentGameState === GameState.EditingLines && bookkeeper.activePoint) {
      // This is a mid-point substitution (active point exists)
      await bookkeeper.recordSubstitution(newHomePlayers, newAwayPlayers);
    } else {
      // Normal line selection or editing lines before any stats recorded
      await bookkeeper.recordActivePlayers(newHomePlayers, newAwayPlayers);
    }
  };

  const handleDone = async () => {
    const leftPlayerCount = selectedHomePlayers.length;
    const rightPlayerCount = selectedAwayPlayers.length;
    const enoughPlayers = leftPlayerCount > 2 && rightPlayerCount > 2;

    if (enoughPlayers) {
      const ratioWarnings = getRatioWarnings();
      const incompleteWarnings = getIncompleteLinesWarning();
      const allWarnings = [...ratioWarnings, ...incompleteWarnings];

      // Prepare new line
      const newHomePlayers = [...selectedHomePlayers].sort((a, b) => a.localeCompare(b));
      const newAwayPlayers = [...selectedAwayPlayers].sort((a, b) => a.localeCompare(b));

      // If there are warnings, show them but allow user to continue
      if (allWarnings.length > 0) {
        setConfirmDialogMessage(
          `Warning!\n${allWarnings.join('\n')}\nDo you want to continue anyway?`
        );
        setPendingLineSubmission({ newHomePlayers, newAwayPlayers });
        setConfirmDialogOpen(true);
      } else {
        await submitLineSelection(newHomePlayers, newAwayPlayers);
      }
    } else {
      // this is a technical limitation. also the submit is disabled with the same criteria
      showSnackbar('Please select at least two players from each team.');
    }
  };

  const handleConfirmContinue = async () => {
    setConfirmDialogOpen(false);
    if (pendingLineSubmission) {
      await submitLineSelection(
        pendingLineSubmission.newHomePlayers,
        pendingLineSubmission.newAwayPlayers
      );
      setPendingLineSubmission(null);
    }
  };

  const handleCancelContinue = () => {
    setConfirmDialogOpen(false);
    setPendingLineSubmission(null);
  };

  const handleUndo = async () => {
    if (currentGameState === GameState.EditingLines) {
      // Cancel editing and return to previous state
      bookkeeper.cancelEditingLines();
    } else {
      await bookkeeper.undo();
    }
  };

  const renderPlayerButton = (player: StoredPlayer, isHomeTeam: boolean) => {
    const selectedList = isHomeTeam ? selectedHomePlayers : selectedAwayPlayers;
    const isSelected = selectedList.includes(player.name);
    const isOpen = player.is_open;

    // Color logic: Blue for open players, purple for women players
    const getButtonSx = () => {
      const baseSx = {
        my: 0.2,
        py: 1.2,
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        textTransform: 'none',
        fontSize: '0.9em',
        fontWeight: isSelected ? 'bold' : 'normal',
      };

      if (isOpen) {
        // Open players: blue styling
        return {
          ...baseSx,
          backgroundColor: isSelected ? '#1976d2' : 'transparent',
          borderColor: isSelected ? '#1976d2' : '#2196f3',
          color: isSelected ? 'white' : '#1976d2',
          '&:hover': {
            backgroundColor: isSelected ? '#1565c0' : '#e3f2fd',
          },
        };
      } else {
        // Women players: purple styling
        return {
          ...baseSx,
          backgroundColor: isSelected ? '#9c27b0' : 'transparent',
          borderColor: isSelected ? '#9c27b0' : '#ce93d8',
          color: isSelected ? 'white' : '#9c27b0',
          '&:hover': {
            backgroundColor: isSelected ? '#7b1fa2' : '#f3e5f5',
          },
        };
      }
    };

    return (
      <Button
        key={player.name}
        onClick={() => togglePlayerSelection(player.name, isHomeTeam)}
        fullWidth
        variant={isSelected ? 'contained' : 'outlined'}
        sx={getButtonSx()}
      >
        {player.name}
      </Button>
    );
  };

  const buttonText = isEditingLine ? 'Resume Point' : 'Start Point';

  const helpText = () => {
    if (isEditingLine) {
      return "Tap player names to Edit the active line, then click 'Resume Point'.";
    }

    if (bookkeeper.firstPoint()) {
      return 'Select players for the first point.';
    }

    if (bookkeeper.firstPointAfterHalf()) {
      return 'Select players for the next point.';
    }

    return 'Players not on the previous line are pre-selected. Adjust and confirm.';
  };

  const secondaryActions = [];

  if (isEditingLine) {
    secondaryActions.push({
      label: 'Cancel',
      onClick: handleUndo,
      color: 'warning' as const,
      variant: 'contained' as const,
    });
  } else if (bookkeeper.getUndoCount() > 0) {
    let text = 'Undo';
    if (bookkeeper.getUndoEvent() == 'recordPoint') {
      text = 'Undo Point';
    } else if (bookkeeper.getUndoEvent() == 'recordHalf') {
      text = 'Undo Half';
    }
    secondaryActions.push({
      label: text,
      onClick: handleUndo,
      color: 'warning' as const,
      variant: 'contained' as const,
    });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1.25 }}>
      <Box sx={{ flexGrow: 1, overflowX: 'hidden', mb: 1.25 }}>
        <Box sx={{ display: 'flex', height: '100%' }}>
          <Box sx={{ width: '30%', pr: 1 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
              {bookkeeper.getHomeTeamName()} ({selectedHomePlayers.length}/{lineSize})
            </Typography>
            {homeRoster.map(player => renderPlayerButton(player, true))}
          </Box>

          <Box sx={{ width: '40%' }}>
            <PointDisplay bookkeeper={bookkeeper} />
          </Box>

          <Box sx={{ width: '30%', pl: 1 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
              {bookkeeper.getAwayTeamName()} ({selectedAwayPlayers.length}/{lineSize})
            </Typography>
            {awayRoster.map(player => renderPlayerButton(player, false))}
          </Box>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ mt: 2, p: 1, bgcolor: '#f5f5f5' }}>
        <Typography variant="body2" color="text.secondary">
          {helpText()}
        </Typography>
      </Paper>

      <ActionBar
        primaryActions={[
          {
            label: buttonText,
            onClick: handleDone,
            disabled: selectedHomePlayers.length < 2 || selectedAwayPlayers.length < 2,
            color: 'success' as const,
            variant: 'contained' as const,
          },
        ]}
        secondaryActions={secondaryActions}
      />

      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelContinue}
        aria-labelledby="warning-dialog-title"
        aria-describedby="warning-dialog-description"
      >
        <DialogTitle id="warning-dialog-title">Line Selection Warning</DialogTitle>
        <DialogContent>
          <DialogContentText id="warning-dialog-description" sx={{ whiteSpace: 'pre-line' }}>
            {confirmDialogMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelContinue} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmContinue} color="primary" variant="contained" autoFocus>
            Continue Anyway
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="warning"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SelectLines;
