import React, { useState, useEffect, useMemo } from 'react';
import { Bookkeeper } from './bookkeeper';
import PointDisplay from './PointDisplay';
import ActionBar from './ActionBar';
import { StoredPlayer } from './db';
import { Box, Button, Typography, Paper, DialogContentText } from '@mui/material';
import { useSnackbar } from './notifications';
import { useConfirmDialog } from './confirm';

const SelectLines: React.FC<{
  bookkeeper: Bookkeeper;
  onComplete?: () => void;
}> = ({ bookkeeper, onComplete }) => {
  // Get mode directly from bookkeeper
  const mode = bookkeeper.getSelectLinesMode();
  const lastPlayedLine = bookkeeper.lastPlayedLine;
  const lineSize = bookkeeper.league.lineSize;

  // Determine behavior based on mode
  const isEditing = mode === 'editing' || mode === 'substitution';
  const isSubstitution = mode === 'substitution';

  // Memoize rosters to prevent infinite re-renders
  const homeRoster = useMemo(() => bookkeeper.getHomeRoster(), [bookkeeper]);
  const awayRoster = useMemo(() => bookkeeper.getAwayRoster(), [bookkeeper]);

  const [selectedHomePlayers, setSelectedHomePlayers] = useState<string[]>([]);
  const [selectedAwayPlayers, setSelectedAwayPlayers] = useState<string[]>([]);

  const { showSnackbar, SnackbarComponent } = useSnackbar();
  const { confirm, DialogComponent } = useConfirmDialog();

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

  const getLinesWarning = () => {
    const warnings: string[] = [];

    if (selectedHomePlayers.length < lineSize) {
      warnings.push(
        `${bookkeeper.getHomeTeamName()}: ${selectedHomePlayers.length}/${lineSize} players selected`
      );
    } else if (selectedHomePlayers.length > lineSize) {
      warnings.push(
        `${bookkeeper.getHomeTeamName()}: ${selectedHomePlayers.length}/${lineSize} players selected (too many)`
      );
    }

    if (selectedAwayPlayers.length < lineSize) {
      warnings.push(
        `${bookkeeper.getAwayTeamName()}: ${selectedAwayPlayers.length}/${lineSize} players selected`
      );
    } else if (selectedAwayPlayers.length > lineSize) {
      warnings.push(
        `${bookkeeper.getAwayTeamName()}: ${selectedAwayPlayers.length}/${lineSize} players selected (too many)`
      );
    }

    return warnings;
  };

  useEffect(() => {
    if (isEditing && bookkeeper.homePlayers && bookkeeper.awayPlayers) {
      // Editing existing lines - pre-populate
      setSelectedHomePlayers(bookkeeper.homePlayers);
      setSelectedAwayPlayers(bookkeeper.awayPlayers);
    } else if (lastPlayedLine) {
      // Initial selection - pre-select players not on last line
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
    mode,
    lastPlayedLine,
    bookkeeper.homePlayers,
    bookkeeper.awayPlayers,
    homeRoster,
    awayRoster,
  ]);

  const togglePlayerSelection = (playerName: string, isHomeTeam: boolean) => {
    const currentSelection = isHomeTeam ? selectedHomePlayers : selectedAwayPlayers;
    const setter = isHomeTeam ? setSelectedHomePlayers : setSelectedAwayPlayers;

    let newSelection;
    if (currentSelection.includes(playerName)) {
      newSelection = currentSelection.filter(p => p !== playerName);
    } else {
      newSelection = [...currentSelection, playerName];
    }
    setter(newSelection.sort((a, b) => a.localeCompare(b)));
  };

  const submitLineSelection = async (newHomePlayers: string[], newAwayPlayers: string[]) => {
    if (isSubstitution) {
      // Mid-point substitution
      await bookkeeper.recordSubstitution(newHomePlayers, newAwayPlayers);
    } else {
      // Normal line selection (initial or editing before point starts)
      await bookkeeper.recordActivePlayers(newHomePlayers, newAwayPlayers);
    }

    // Notify parent to clear local editing state
    onComplete?.();
  };

  const handleDone = async () => {
    const leftPlayerCount = selectedHomePlayers.length;
    const rightPlayerCount = selectedAwayPlayers.length;
    const enoughPlayers = leftPlayerCount > 2 && rightPlayerCount > 2;

    if (enoughPlayers) {
      const ratioWarnings = getRatioWarnings();
      const lineWarnings = getLinesWarning();
      const allWarnings = [...ratioWarnings, ...lineWarnings];

      // Prepare new line
      const newHomePlayers = [...selectedHomePlayers].sort((a, b) => a.localeCompare(b));
      const newAwayPlayers = [...selectedAwayPlayers].sort((a, b) => a.localeCompare(b));

      // If there are warnings, show them but allow user to continue
      if (allWarnings.length > 0) {
        const confirmed = await confirm({
          title: 'Line Selection Warning',
          content: (
            <DialogContentText>
              <Box component="div" sx={{ mb: 2 }}>
                The following issues were detected with the line selection:
              </Box>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {allWarnings.map((warning, index) => (
                  <Box component="li" key={index} sx={{ mb: 0.5 }}>
                    {warning}
                  </Box>
                ))}
              </Box>
              <Box component="div" sx={{ mt: 2 }}>
                Do you want to continue anyway?
              </Box>
            </DialogContentText>
          ),
          confirmText: 'Continue Anyway',
        });

        if (!confirmed) {
          return;
        }
      }

      await submitLineSelection(newHomePlayers, newAwayPlayers);
    } else {
      // this is a technical limitation. also the submit is disabled with the same criteria
      showSnackbar('Please select at least two players from each team.');
    }
  };

  const handleCancel = async () => {
    onComplete?.();
  };

  const handleUndo = async () => {
    await bookkeeper.undo();
    // undoing half does not complete the line selection
    if (bookkeeper.getUndoEvent() != 'recordHalf') {
      onComplete?.();
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
        };
      } else {
        // Women players: purple styling
        return {
          ...baseSx,
          backgroundColor: isSelected ? '#9c27b0' : 'transparent',
          borderColor: isSelected ? '#9c27b0' : '#ce93d8',
          color: isSelected ? 'white' : '#9c27b0',
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

  const buttonText = isEditing ? 'Resume Point' : 'Start Point';

  const helpText = () => {
    if (mode === 'substitution') {
      return "Substituting players mid-point. Adjust the line and click 'Resume Point'.";
    }
    if (mode === 'editing') {
      return "Editing line before point starts. Adjust and click 'Resume Point'.";
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

  if (isEditing) {
    secondaryActions.push({
      label: 'Cancel',
      onClick: handleCancel,
      color: 'warning' as const,
      variant: 'contained' as const,
    });
  } else if (bookkeeper.getUndoCount() > 0) {
    let text = 'Undo';
    if (bookkeeper.getUndoEvent() === 'recordPoint') {
      text = 'Undo Point';
    } else if (bookkeeper.getUndoEvent() === 'recordHalf') {
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

      {DialogComponent}
      {SnackbarComponent}
    </Box>
  );
};

export default SelectLines;
