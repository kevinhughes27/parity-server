import React, { useState, useEffect, useMemo } from 'react';
import { Bookkeeper, GameState } from './bookkeeper';
import PointDisplay from './PointDisplay';
import ActionBar from './ActionBar';
import { useTeams } from './hooks';
import { getPlayerGender } from '../../api';
import { Box, Button, Typography, Paper, Alert } from '@mui/material';

const SelectLines: React.FC<{ bookkeeper: Bookkeeper }> = ({ bookkeeper }) => {
  const currentGameState = bookkeeper.gameState();
  const isEditingLine =
    currentGameState === GameState.EditingLines || bookkeeper.activePoint !== null;
  const lastPlayedLine = bookkeeper.lastPlayedLine;
  const lineSize = bookkeeper.league.lineSize;

  // Fetch team data to get gender information
  const { allLeaguePlayers } = useTeams(bookkeeper.league.id.toString());

  // Memoize rosters to prevent infinite re-renders
  const homeRoster = useMemo(() => bookkeeper.getHomeRoster(), [bookkeeper]);
  const awayRoster = useMemo(() => bookkeeper.getAwayRoster(), [bookkeeper]);

  const [selectedHomePlayers, setSelectedHomePlayers] = useState<string[]>([]);
  const [selectedAwayPlayers, setSelectedAwayPlayers] = useState<string[]>([]);

  // Hard-coded league ratio (4:2 - updated ratio)
  const LEAGUE_RATIO = { open: 4, women: 2 };

  // Helper functions for ratio counting
  const getRatioCounts = (playerNames: string[]) => {
    const open = playerNames.filter(name => getPlayerGender(name, allLeaguePlayers)).length;
    const women = playerNames.length - open;
    return { open, women };
  };

  const checkRatioCompliance = (playerNames: string[]) => {
    const { open, women } = getRatioCounts(playerNames);
    return open === LEAGUE_RATIO.open && women === LEAGUE_RATIO.women;
  };

  const getRatioWarnings = () => {
    const warnings: string[] = [];

    if (selectedHomePlayers.length === lineSize) {
      const homeCompliant = checkRatioCompliance(selectedHomePlayers);
      if (!homeCompliant) {
        const { open, women } = getRatioCounts(selectedHomePlayers);
        warnings.push(
          `${bookkeeper.homeTeam.name}: ${open} ON2, ${women} WN2 (expected ${LEAGUE_RATIO.open} ON2, ${LEAGUE_RATIO.women} WN2)`
        );
      }
    }

    if (selectedAwayPlayers.length === lineSize) {
      const awayCompliant = checkRatioCompliance(selectedAwayPlayers);
      if (!awayCompliant) {
        const { open, women } = getRatioCounts(selectedAwayPlayers);
        warnings.push(
          `${bookkeeper.awayTeam.name}: ${open} ON2, ${women} WN2 (expected ${LEAGUE_RATIO.open} ON2, ${LEAGUE_RATIO.women} WN2)`
        );
      }
    }

    return warnings;
  };

  const getIncompleteLinesWarning = () => {
    const warnings: string[] = [];

    if (selectedHomePlayers.length > 0 && selectedHomePlayers.length < lineSize) {
      warnings.push(
        `${bookkeeper.homeTeam.name}: ${selectedHomePlayers.length}/${lineSize} players selected`
      );
    }

    if (selectedAwayPlayers.length > 0 && selectedAwayPlayers.length < lineSize) {
      warnings.push(
        `${bookkeeper.awayTeam.name}: ${selectedAwayPlayers.length}/${lineSize} players selected`
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

    // Check for both complete lines and at least some players selected
    const hasPlayers = leftPlayerCount > 0 && rightPlayerCount > 0;
    const hasFullLines = leftCorrectNumPlayers && rightCorrectNumPlayers;

    if (hasFullLines || hasPlayers) {
      // Only show warnings when actually starting a point (not just editing lines)
      if (currentGameState !== GameState.EditingLines) {
        // Get all warnings
        const ratioWarnings = getRatioWarnings();
        const incompleteWarnings = getIncompleteLinesWarning();
        const allWarnings = [...ratioWarnings, ...incompleteWarnings];

        // If there are warnings, show them but allow user to continue
        if (allWarnings.length > 0) {
          const continueAnyway = window.confirm(
            `Warning:\n${allWarnings.join('\n')}\n\nExpected ratio: ${LEAGUE_RATIO.open} ON2, ${LEAGUE_RATIO.women} WN2\n\nDo you want to continue anyway?`
          );
          if (!continueAnyway) {
            return;
          }
        }
      }

      if (currentGameState === GameState.EditingLines && bookkeeper.activePoint) {
        // This is a mid-point substitution (active point exists)
        await bookkeeper.recordSubstitution(newHomePlayers, newAwayPlayers);
      } else {
        // Normal line selection or editing lines before any stats recorded
        await bookkeeper.recordActivePlayers(newHomePlayers, newAwayPlayers);
      }
    } else {
      window.alert('Please select at least one player from each team.');
    }
  };

  const handleUndo = async () => {
    if (currentGameState === GameState.EditingLines) {
      // Cancel editing and return to previous state
      bookkeeper.cancelEditingLines();
    } else {
      await bookkeeper.undo();
    }
  };

  const renderPlayerButton = (playerName: string, isHomeTeam: boolean) => {
    const selectedList = isHomeTeam ? selectedHomePlayers : selectedAwayPlayers;
    const isSelected = selectedList.includes(playerName);
    const isOpen = getPlayerGender(playerName, allLeaguePlayers);

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
        key={playerName}
        onClick={() => togglePlayerSelection(playerName, isHomeTeam)}
        fullWidth
        variant={isSelected ? 'contained' : 'outlined'}
        sx={getButtonSx()}
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
              {bookkeeper.homeTeam.name}{' '}
              {selectedHomePlayers.length > 0 &&
                `(${(() => {
                  const { open, women } = getRatioCounts(selectedHomePlayers);
                  return `${open} ON2, ${women} WN2`;
                })()})`}
            </Typography>
            {homeRoster.map(player => renderPlayerButton(player, true))}
          </Box>

          <Box sx={{ width: '40%' }}>
            <PointDisplay bookkeeper={bookkeeper} />
          </Box>

          <Box sx={{ width: '30%', pl: 1 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
              {bookkeeper.awayTeam.name}{' '}
              {selectedAwayPlayers.length > 0 &&
                `(${(() => {
                  const { open, women } = getRatioCounts(selectedAwayPlayers);
                  return `${open} ON2, ${women} WN2`;
                })()})`}
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
