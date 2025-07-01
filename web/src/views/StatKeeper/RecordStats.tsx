import React from 'react';
import { Bookkeeper } from './bookkeeper';
import PointDisplay from './PointDisplay';
import ActionBar from './ActionBar';
import { Box, Button, Typography } from '@mui/material';

const playerButtonStyles = {
  enabled: {
    color: '#000',
    backgroundColor: '#e3f2fd',
    border: '1px solid #2196f3',
    fontWeight: 'normal',
  },
  active: {
    color: '#000',
    backgroundColor: '#a7d7f5',
    border: '1px solid #2196f3',
    fontWeight: 'bold',
  },
  'not-on-line': {
    color: '#adb5bd',
    backgroundColor: '#f8f9fa',
    border: '1px solid #eee',
    fontWeight: 'normal',
  },
  'disabled-no-possession': {
    color: '#999',
    backgroundColor: '#e0e0e0',
    border: '1px solid #ccc',
    fontWeight: 'normal',
  },
};



const RecordStats: React.FC<{ bookkeeper: Bookkeeper }> = ({ bookkeeper }) => {
  const fullHomeRoster = bookkeeper.getHomeRoster();
  const fullAwayRoster = bookkeeper.getAwayRoster();

  const handlePlayerClick = async (playerName: string, isHomeTeamPlayer: boolean) => {
    if (bookkeeper.shouldRecordNewPass()) {
      await bookkeeper.recordPass(playerName);
    } else {
      await bookkeeper.recordFirstActor(playerName, isHomeTeamPlayer);
    }
  };

  const handlePull = async () => {
    await bookkeeper.recordPull();
  };

  const handlePoint = async () => {
    await bookkeeper.recordPoint();
  };

  const handleDrop = async () => {
    await bookkeeper.recordDrop();
  };

  const handleThrowaway = async () => {
    await bookkeeper.recordThrowAway();
  };

  const handleD = async () => {
    if (!bookkeeper.firstActor) {
      alert('Select the player who got the D first.');
      return;
    }
    await bookkeeper.recordD();
  };

  const handleCatchD = async () => {
    if (!bookkeeper.firstActor) {
      alert('Select the player who got the Catch D first.');
      return;
    }
    await bookkeeper.recordCatchD();
  };

  const handleUndo = async () => {
    await bookkeeper.undo();
  };

  const renderPlayerButton = (playerName: string, isHomeTeamButton: boolean) => {
    const buttonState = bookkeeper.getPlayerButtonState(playerName, isHomeTeamButton);
    const buttonStyle = playerButtonStyles[buttonState.variant];

    return (
      <Button
        key={playerName}
        onClick={() => handlePlayerClick(playerName, isHomeTeamButton)}
        disabled={!buttonState.enabled}
        fullWidth
        variant="text"
        size="small"
        title={buttonState.reason}
        sx={{
          my: 0.2,
          py: 1.2,
          pl: 2,
          justifyContent: 'flex-start',
          whiteSpace: 'nowrap',
          fontSize: '0.9em',
          textTransform: 'none',
          ...buttonStyle,
        }}
      >
        {playerName}
      </Button>
    );
  };

  const pullState = bookkeeper.getActionButtonState('pull');
  const pointState = bookkeeper.getActionButtonState('point');
  const dropState = bookkeeper.getActionButtonState('drop');
  const throwawayState = bookkeeper.getActionButtonState('throwaway');
  const dState = bookkeeper.getActionButtonState('d');
  const catchDState = bookkeeper.getActionButtonState('catchD');
  const undoState = bookkeeper.getActionButtonState('undo');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1.25 }}>
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', height: '100%' }}>
          <Box sx={{ width: '30%', pr: 1, overflowX: 'hidden' }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
              {bookkeeper.homeTeam.name}
            </Typography>
            {fullHomeRoster.map(player => renderPlayerButton(player, true))}
          </Box>

          <Box sx={{ width: '40%' }}>
            <PointDisplay bookkeeper={bookkeeper} />
          </Box>

          <Box sx={{ width: '30%', pl: 1, overflowX: 'hidden' }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
              {bookkeeper.awayTeam.name}
            </Typography>
            {fullAwayRoster.map(player => renderPlayerButton(player, false))}
          </Box>
        </Box>
      </Box>

      <ActionBar
        primaryActions={[
          {
            label: 'Pull',
            onClick: handlePull,
            disabled: !pullState.enabled,
            color: 'info',
            variant: 'outlined',
          },
          {
            label: 'Point!',
            onClick: handlePoint,
            disabled: !pointState.enabled,
            color: 'success',
            variant: 'contained',
          },
          {
            label: 'Drop',
            onClick: handleDrop,
            disabled: !dropState.enabled,
            color: 'warning',
            variant: 'outlined',
          },
          {
            label: 'Throwaway',
            onClick: handleThrowaway,
            disabled: !throwawayState.enabled,
            color: 'warning',
            variant: 'outlined',
          },
          {
            label: 'D (Block)',
            onClick: handleD,
            disabled: !dState.enabled,
            color: 'warning',
            variant: 'outlined',
          },
          {
            label: 'Catch D',
            onClick: handleCatchD,
            disabled: !catchDState.enabled,
            color: 'warning',
            variant: 'outlined',
          },
        ]}
        secondaryActions={[
          {
            label: 'Undo',
            onClick: handleUndo,
            disabled: !undoState.enabled,
            color: 'warning',
            variant: 'contained',
          },
        ]}
      />
    </Box>
  );
};

export default RecordStats;
