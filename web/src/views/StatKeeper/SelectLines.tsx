import React, { useState, useEffect, useMemo } from 'react';
import { Bookkeeper, GameState } from './bookkeeper';
import PointDisplay from './PointDisplay';
import ActionBar from './ActionBar';
import { Box, Button, Typography, Paper } from '@mui/material';

const SelectLines: React.FC<{ bookkeeper: Bookkeeper }> = ({ bookkeeper }) => {
  const currentGameState = bookkeeper.gameState();
  const isEditingLine =
    currentGameState === GameState.EditingLines || bookkeeper.activePoint !== null;
  const lastPlayedLine = bookkeeper.getLastPlayedLine();
  const lineSize = bookkeeper.league.lineSize;

  // Memoize rosters to prevent infinite re-renders
  const homeRoster = useMemo(() => bookkeeper.getHomeRoster(), [bookkeeper]);
  const awayRoster = useMemo(() => bookkeeper.getAwayRoster(), [bookkeeper]);

  const [selectedHomePlayers, setSelectedHomePlayers] = useState<string[]>([]);
  const [selectedAwayPlayers, setSelectedAwayPlayers] = useState<string[]>([]);

  useEffect(() => {
    if (isEditingLine && bookkeeper.homePlayers && bookkeeper.awayPlayers) {
      setSelectedHomePlayers(bookkeeper.homePlayers);
      setSelectedAwayPlayers(bookkeeper.awayPlayers);
    } else if (lastPlayedLine) {
      // pre-select players not on the last played line.
      setSelectedHomePlayers(homeRoster.filter(p => !lastPlayedLine.home.includes(p)));
      setSelectedAwayPlayers(awayRoster.filter(p => !lastPlayedLine.away.includes(p)));
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
    const teamName = isHomeTeam ? bookkeeper.homeTeam.name : bookkeeper.awayTeam.name;

    let newSelection;
    if (currentSelection.includes(playerName)) {
      newSelection = currentSelection.filter(p => p !== playerName);
    } else {
      if (currentSelection.length < lineSize) {
        newSelection = [...currentSelection, playerName];
      } else {
        alert(`Cannot select more than ${lineSize} players for ${teamName}.`);
        return;
      }
    }
    setter(newSelection.sort((a, b) => a.localeCompare(b)));
  };

  const handleDone = async () => {
    const leftPlayerCount = selectedHomePlayers.length;
    const rightPlayerCount = selectedAwayPlayers.length;

    const leftCorrectNumPlayers = leftPlayerCount === lineSize;
    const rightCorrectNumPlayers = rightPlayerCount === lineSize;

    const newHomePlayers = [...selectedHomePlayers].sort((a, b) => a.localeCompare(b));
    const newAwayPlayers = [...selectedAwayPlayers].sort((a, b) => a.localeCompare(b));

    if (leftCorrectNumPlayers && rightCorrectNumPlayers) {
      if (currentGameState === GameState.EditingLines && bookkeeper.activePoint) {
        // This is a mid-point substitution (active point exists)
        await bookkeeper.recordSubstitution(newHomePlayers, newAwayPlayers);
      } else {
        // Normal line selection or editing lines before any stats recorded
        await bookkeeper.recordActivePlayers(newHomePlayers, newAwayPlayers);
      }
    } else {
      let message = 'Incorrect number of players:';
      if (!leftCorrectNumPlayers) {
        message += `\n${bookkeeper.homeTeam.name}: ${leftPlayerCount}/${lineSize} selected`;
      }
      if (!rightCorrectNumPlayers) {
        message += `\n${bookkeeper.awayTeam.name}: ${rightPlayerCount}/${lineSize} selected`;
      }
      window.alert(message);
    }
  };

  const handleUndo = async () => {
    if (currentGameState === GameState.EditingLines) {
      // Cancel editing and return to previous state
      bookkeeper.cancelEditingLines();
      bookkeeper.notifyListeners();
    } else {
      await bookkeeper.undo();
    }
  };

  const renderPlayerButton = (playerName: string, isHomeTeam: boolean) => {
    const selectedList = isHomeTeam ? selectedHomePlayers : selectedAwayPlayers;
    const isSelected = selectedList.includes(playerName);

    return (
      <Button
        key={playerName}
        onClick={() => togglePlayerSelection(playerName, isHomeTeam)}
        fullWidth
        variant={isSelected ? 'contained' : 'outlined'}
        color={isSelected ? 'info' : 'inherit'}
        sx={{
          my: 0.2,
          py: 1.2,
          justifyContent: 'flex-start',
          whiteSpace: 'nowrap',
          textTransform: 'none',
          fontSize: '0.9em',
          fontWeight: isSelected ? 'bold' : 'normal',
        }}
      >
        {playerName}
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1.25 }}>
      <Box sx={{ flexGrow: 1, overflowX: 'hidden', mb: 1.25 }}>
        <Box sx={{ display: 'flex', height: '100%' }}>
          <Box sx={{ width: '30%', pr: 1 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
              {bookkeeper.homeTeam.name} ({selectedHomePlayers.length}/{lineSize})
            </Typography>
            {homeRoster.map(player => renderPlayerButton(player, true))}
          </Box>

          <Box sx={{ width: '40%' }}>
            <PointDisplay bookkeeper={bookkeeper} />
          </Box>

          <Box sx={{ width: '30%', pl: 1 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
              {bookkeeper.awayTeam.name} ({selectedAwayPlayers.length}/{lineSize})
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
            disabled: selectedHomePlayers.length === 0 || selectedAwayPlayers.length === 0,
            color: 'success',
            variant: 'contained',
          },
        ]}
        secondaryActions={
          currentGameState === GameState.EditingLines
            ? [
                {
                  label: 'Cancel',
                  onClick: handleUndo,
                  color: 'warning',
                  variant: 'contained',
                },
              ]
            : bookkeeper.getUndoCount() > 0 && !isEditingLine
              ? [
                  {
                    label: 'Undo Point',
                    onClick: handleUndo,
                    color: 'warning',
                    variant: 'contained',
                  },
                ]
              : []
        }
      />
    </Box>
  );
};

export default SelectLines;
