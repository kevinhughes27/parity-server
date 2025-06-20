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
  // this whole state can always be inferred by checking if the active point is not done
  const isResumingPointMode = bookkeeper.getIsResumingPointMode();

  const lastPlayedLine = bookkeeper.getLastPlayedLine();

  // Memoize rosters to prevent infinite re-renders
  const homeRoster = useMemo(() => bookkeeper.getHomeParticipants(), [bookkeeper]);
  const awayRoster = useMemo(() => bookkeeper.getAwayParticipants(), [bookkeeper]);
  const [selectedHomePlayers, setSelectedHomePlayers] = useState<string[]>([]);
  const [selectedAwayPlayers, setSelectedAwayPlayers] = useState<string[]>([]);

  const leagueLineSize = bookkeeper.league.lineSize;

  useEffect(() => {
    if (isResumingPointMode) {
      // When resuming/changing lines mid-point, use the preserved line data
      // awkward wording. this is current line when changing mid point
      // but maybe I am not re-using the components properly for SelectLines and ChangeLines
      if (lastPlayedLine) {
        setSelectedHomePlayers(lastPlayedLine.home || []);
        setSelectedAwayPlayers(lastPlayedLine.away || []);
      } else {
        // Fallback to current bookkeeper players if no preserved line
        setSelectedHomePlayers(bookkeeper.homePlayers || []);
        setSelectedAwayPlayers(bookkeeper.awayPlayers || []);
      }
    } else if (lastPlayedLine) {
      // Pre-select players NOT on the last played line.
      // homeRoster and awayRoster are already sorted.
      setSelectedHomePlayers(homeRoster.filter(p => !lastPlayedLine.home.includes(p)));
      setSelectedAwayPlayers(awayRoster.filter(p => !lastPlayedLine.away.includes(p)));
    } else {
      // Default case: reset to blank slate
      // This handles: start of game, after halftime, after point scored
      setSelectedHomePlayers([]);
      setSelectedAwayPlayers([]);
    }
  }, [
    isResumingPointMode,
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
      if (currentSelection.length < leagueLineSize) {
        newSelection = [...currentSelection, playerName];
      } else {
        alert(`Cannot select more than ${leagueLineSize} players for ${teamName}.`);
        return; // Do not update selection
      }
    }
    // Sort the selection before setting state, though this is mainly for internal consistency
    // as the display order is driven by the main roster lists.
    setter(newSelection.sort((a, b) => a.localeCompare(b)));
  };

  const handleDone = async () => {
    const leftPlayerCount = selectedHomePlayers.length;
    const rightPlayerCount = selectedAwayPlayers.length;

    const leftCorrectNumPlayers = leftPlayerCount === leagueLineSize;
    const rightCorrectNumPlayers = rightPlayerCount === leagueLineSize;

    const newHomePlayers = [...selectedHomePlayers].sort((a, b) => a.localeCompare(b));
    const newAwayPlayers = [...selectedAwayPlayers].sort((a, b) => a.localeCompare(b));

    if (leftCorrectNumPlayers && rightCorrectNumPlayers) {
      if (isResumingPointMode && bookkeeper.activePoint) {
        // This is a mid-point substitution
        await handleSubstitution(newHomePlayers, newAwayPlayers);
      } else {
        // Normal line selection
        await bookkeeper.performAction(
          bk => bk.recordActivePlayers(newHomePlayers, newAwayPlayers),
          { skipViewChange: true }
        );
      }
      await handleLinesSelected();
    } else {
      let message = 'Incorrect number of players:';
      if (!leftCorrectNumPlayers) {
        message += `\n${bookkeeper.homeTeam.name}: ${leftPlayerCount}/${leagueLineSize} selected`;
      }
      if (!rightCorrectNumPlayers) {
        message += `\n${bookkeeper.awayTeam.name}: ${rightPlayerCount}/${leagueLineSize} selected`;
      }
      message += '\n\nContinue with these players anyway?';

      if (window.confirm(message)) {
        if (isResumingPointMode && bookkeeper.activePoint) {
          // This is a mid-point substitution
          await handleSubstitution(newHomePlayers, newAwayPlayers);
        } else {
          // Normal line selection
          await bookkeeper.performAction(
            bk => bk.recordActivePlayers(newHomePlayers, newAwayPlayers),
            { skipViewChange: true }
          );
        }
        await handleLinesSelected();
      }
    }
  };

  const handleSubstitution = async (newHomePlayers: string[], newAwayPlayers: string[]) => {
    const oldHomePlayers = lastPlayedLine?.home || [];
    const oldAwayPlayers = lastPlayedLine?.away || [];

    // Find players who were substituted out and in
    const homePlayersOut = oldHomePlayers.filter(p => !newHomePlayers.includes(p));
    const homePlayersIn = newHomePlayers.filter(p => !oldHomePlayers.includes(p));
    const awayPlayersOut = oldAwayPlayers.filter(p => !newAwayPlayers.includes(p));
    const awayPlayersIn = newAwayPlayers.filter(p => !oldAwayPlayers.includes(p));

    const allPlayersOut = [...homePlayersOut, ...awayPlayersOut];
    const allPlayersIn = [...homePlayersIn, ...awayPlayersIn];

    await bookkeeper.performAction(
      bk => bk.recordSubstitution(newHomePlayers, newAwayPlayers, allPlayersOut, allPlayersIn),
      { skipViewChange: true }
    );
  };

  const handleLinesSelected = async () => {
    if (bookkeeper.homePlayers && bookkeeper.awayPlayers) {
      if (bookkeeper.activePoint === null && !bookkeeper.firstPointOfGameOrHalf()) {
        await bookkeeper.performAction(bk => bk.prepareNewPointAfterScore());
      } else {
        // No-op action to force view transition
        await bookkeeper.performAction(bk => bk.resumePoint(), { skipSave: true });
      }
    }
  };

  const handleUndoLastAction = async () => {
    await bookkeeper.performAction(bk => bk.undo());
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

  const buttonText = isResumingPointMode ? 'Resume Point' : 'Start Point';

  // Base help text without undo information
  let helpText = isResumingPointMode
    ? "Current line is selected. Make any adjustments needed, then click 'Resume Point'."
    : lastPlayedLine
      ? 'Players not on the previous line are pre-selected. Adjust and confirm.'
      : bookkeeper.points.length === 0 && bookkeeper.pointsAtHalf === 0
        ? 'Select players for the first point.'
        : 'Select players for the next point.';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1.25 }}>
      <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 1.25 }}>
        <Box sx={{ display: 'flex', height: '100%' }}>
          <Box sx={{ width: '30%', pr: 1 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
              {bookkeeper.homeTeam.name} ({selectedHomePlayers.length}/{leagueLineSize})
            </Typography>
            {homeRoster.map(player => renderPlayerButton(player, true))}
          </Box>

          <Box sx={{ width: '40%' }}>
            <PointEventsDisplay bookkeeper={bookkeeper} />
          </Box>

          <Box sx={{ width: '30%', pl: 1 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
              {bookkeeper.awayTeam.name} ({selectedAwayPlayers.length}/{leagueLineSize})
            </Typography>
            {awayRoster.map(player => renderPlayerButton(player, false))}
          </Box>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ mt: 2, p: 1, bgcolor: '#f5f5f5' }}>
        <Typography variant="body2" color="text.secondary">
          {helpText}
          {lastPlayedLine && !isResumingPointMode && (
            <>
              <br />
              If a point was just scored, 'Undo Last Action' will revert the score and take you back
              to editing the last event of that point.
            </>
          )}
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
          bookkeeper.getMementosCount() > 0 && !isResumingPointMode
            ? [
                {
                  label: 'Undo Last Action',
                  onClick: handleUndoLastAction,
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
