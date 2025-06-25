import React, { useState, useEffect, useMemo } from 'react';
import { Bookkeeper } from './bookkeeper';
import PointEventsDisplay from './PointEventsDisplay';
import ActionBar from './ActionBar';
import { Box, Button, Typography, Paper } from '@mui/material';

interface SelectLinesProps {
  bookkeeper: Bookkeeper;
  actionBarHeight: string;
}

const SelectLines: React.FC<SelectLinesProps> = ({ bookkeeper, actionBarHeight }) => {
  const isEditingLine = bookkeeper.activePoint !== null;
  const lastPlayedLine = bookkeeper.getLastPlayedLine();
  const lineSize = bookkeeper.league.lineSize;

  // Memoize rosters to prevent infinite re-renders
  const homeRoster = useMemo(() => bookkeeper.getHomeRoster(), [bookkeeper]);
  const awayRoster = useMemo(() => bookkeeper.getAwayRoster(), [bookkeeper]);

  const [selectedHomePlayers, setSelectedHomePlayers] = useState<string[]>([]);
  const [selectedAwayPlayers, setSelectedAwayPlayers] = useState<string[]>([]);

  useEffect(() => {
    if (isEditingLine) {
      setSelectedHomePlayers(bookkeeper.homePlayers!);
      setSelectedAwayPlayers(bookkeeper.awayPlayers!);
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
      if (isEditingLine && bookkeeper.activePoint) {
        // This is a mid-point substitution
        await bookkeeper.recordSubstitution(newHomePlayers, newAwayPlayers);
      } else {
        // Normal line selection
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
      message += '\n\nContinue with these players anyway?';

      if (window.confirm(message)) {
        if (isEditingLine && bookkeeper.activePoint) {
          // This is a mid-point substitution
          await bookkeeper.recordSubstitution(newHomePlayers, newAwayPlayers);
        } else {
          // Normal line selection
          await bookkeeper.recordActivePlayers(newHomePlayers, newAwayPlayers);
        }
      }
    }
  };

  const handleUndo = async () => {
    await bookkeeper.undo();
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
        color={isSelected ? 'primary' : 'inherit'}
        sx={{
          mb: 0.5,
          py: 1,
          justifyContent: 'flex-start',
          textTransform: 'none',
          fontWeight: isSelected ? 'bold' : 'normal',
          fontSize: '0.9em',
        }}
      >
        {playerName}
      </Button>
    );
  };

  const buttonText = isEditingLine ? 'Resume Point' : 'Start Point';

  const helpText = () => {
    if (isEditingLine) {
      return "Tap player names to Edit the active line, then click 'Resume Point'."
    }

    if (bookkeeper.firstPoint()) {
      return "Select players for the first point."
    }

    if (bookkeeper.firstPointAfterHalf()) {
      return "Select players for the next point."
    }

    return "Players not on the previous line are pre-selected. Adjust and confirm."
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1.25 }}>
      <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 1.25 }}>
        <Box sx={{ display: 'flex', height: '100%' }}>
          <Box sx={{ width: '30%', pr: 1 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
              {bookkeeper.homeTeam.name} ({selectedHomePlayers.length}/{lineSize})
            </Typography>
            {homeRoster.map(player => renderPlayerButton(player, true))}
          </Box>

          <Box sx={{ width: '40%' }}>
            <PointEventsDisplay bookkeeper={bookkeeper} />
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
        actionBarHeight={actionBarHeight}
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
          bookkeeper.getUndoCount() > 0 && !isEditingLine
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
