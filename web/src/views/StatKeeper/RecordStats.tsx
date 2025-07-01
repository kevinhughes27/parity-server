import React from 'react';
import { Bookkeeper, GameState } from './bookkeeper';
import PointDisplay from './PointDisplay';
import ActionBar from './ActionBar';
import { Box, Button, Typography } from '@mui/material';
import { EventType } from './gameLogic';

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

const getPlayerButtonState = (
  bookkeeper: Bookkeeper,
  playerName: string,
  isHomeTeam: boolean
): {
  enabled: boolean;
  variant: 'active' | 'enabled' | 'disabled-no-possession' | 'not-on-line';
  reason?: string;
} => {
  const isTeamInPossession = isHomeTeam === bookkeeper.homePossession;
  const homePlayersOnActiveLine = bookkeeper.homePlayers || [];
  const awayPlayersOnActiveLine = bookkeeper.awayPlayers || [];
  const isPlayerOnActiveLine = isHomeTeam
    ? homePlayersOnActiveLine.includes(playerName)
    : awayPlayersOnActiveLine.includes(playerName);

  // Bench
  if (!isPlayerOnActiveLine) {
    return {
      enabled: false,
      variant: 'not-on-line',
      reason: 'Player not on active line',
    };
  }

  const currentGameState = bookkeeper.gameState();
  const isActivePlayer = bookkeeper.firstActor === playerName;
  const isFirstPoint = bookkeeper.firstPoint();
  const isFirstPointAfterHalftime = bookkeeper.firstPointAfterHalf();

  // why does variant not imply a style...?
  // also not sure we need reason although it is kind of interesting

  // Special case: first point of game or after halftime, both teams can select who pulls
  if (currentGameState === GameState.Start && (isFirstPoint || isFirstPointAfterHalftime)) {
    return {
      enabled: true,
      variant: 'enabled',
      reason: 'Select puller',
    };
  }

  // Pull state.
  // It is a bit weird, because only the pull button is enabled but if you think
  // about it, it sort of sets up the proper workflow for stat keeping
  if (currentGameState === GameState.Pull) {
    return {
      enabled: false,
      variant: isActivePlayer ? 'active' : 'disabled-no-possession',
      reason: 'Must click Pull or undo',
    };
  }

  if (currentGameState === GameState.WhoPickedUpDisc) {
    if (!isTeamInPossession) {
      return {
        enabled: false,
        variant: 'disabled-no-possession',
        reason: 'Other team picks up disc',
      };
    }
    return {
      enabled: true,
      variant: isActivePlayer ? 'active' : 'enabled',
      reason: 'Select player who picked up disc',
    };
  }

  // When someone has the disc
  if (bookkeeper.firstActor !== null) {
    if (isTeamInPossession) {
      if (isActivePlayer && bookkeeper.shouldRecordNewPass()) {
        return {
          enabled: false,
          variant: 'active',
          reason: 'Player has disc - use action buttons',
        };
      } else {
        return {
          enabled: true,
          variant: isActivePlayer ? 'active' : 'enabled',
          reason: isActivePlayer ? 'Player has disc' : 'Select pass target',
        };
      }
      // team not in possession
    } else {
      return {
        enabled: false,
        variant: 'disabled-no-possession',
        reason: 'Other team has possession',
      };
    }
  }

  // this doesn't seem like the best way to represent.
  // I think I need to pull the D state up explicitly
  // Handle the team not in possesion simply

  // Default case
  if (!isTeamInPossession) {
    return {
      enabled: false,
      variant: 'disabled-no-possession',
      reason: 'Other team has possession',
    };
  }

  return {
    enabled: true,
    variant: 'enabled',
    reason: 'Available for selection',
  };
};

const getActionButtonState = (
  bookkeeper: Bookkeeper,
  action: 'pull' | 'point' | 'drop' | 'throwaway' | 'd' | 'catchD' | 'undo'
): {
  enabled: boolean;
  reason?: string;
} => {
  const currentGameState = bookkeeper.gameState();

  const canTurnover =
    (currentGameState === GameState.Normal ||
      currentGameState === GameState.FirstThrowQuebecVariant ||
      currentGameState === GameState.AfterTurnover) &&
    bookkeeper.firstActor !== null;

  const isPickupAfterScore =
    currentGameState === GameState.FirstThrowQuebecVariant &&
    bookkeeper.activePoint?.getLastEventType() !== EventType.PULL;

  const canDrop =
    canTurnover &&
    // Disable drop for picking up disc after a point (but not after a pull)
    !isPickupAfterScore;

  switch (action) {
    case 'pull':
      return {
        enabled: currentGameState === GameState.Pull && bookkeeper.firstActor !== null,
        reason:
          currentGameState !== GameState.Pull
            ? 'Not in pull state'
            : bookkeeper.firstActor === null
              ? 'No puller selected'
              : undefined,
      };

    case 'point':
      return {
        enabled: currentGameState === GameState.Normal && bookkeeper.firstActor !== null,
        reason:
          bookkeeper.firstActor === null
            ? 'No player selected'
            : currentGameState !== GameState.Normal
              ? 'Cannot score in current state'
              : undefined,
      };

    case 'drop':
      return {
        enabled: canDrop,
        reason:
          bookkeeper.firstActor === null
            ? 'No player selected'
            : !canDrop
              ? 'Cannot drop in current state'
              : undefined,
      };

    case 'throwaway':
      return {
        enabled: canTurnover,
        reason:
          bookkeeper.firstActor === null
            ? 'No player selected'
            : 'Cannot throw away in current state',
      };

    case 'd':
      return {
        enabled: currentGameState === GameState.AfterTurnover && bookkeeper.firstActor !== null,
        reason:
          bookkeeper.firstActor === null
            ? 'No player selected'
            : currentGameState !== GameState.AfterTurnover
              ? 'Can only get D after turnover'
              : undefined,
      };

    case 'catchD':
      return {
        enabled: currentGameState === GameState.AfterTurnover && bookkeeper.firstActor !== null,
        reason:
          bookkeeper.firstActor === null
            ? 'No player selected'
            : currentGameState !== GameState.AfterTurnover
              ? 'Can only get catch D after turnover'
              : undefined,
      };

    case 'undo':
      return {
        enabled: bookkeeper.getUndoCount() > 0,
        reason: bookkeeper.getUndoCount() === 0 ? 'No actions to undo' : undefined,
      };

    default:
      return { enabled: false, reason: 'Unknown action' };
  }
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
    const buttonState = getPlayerButtonState(bookkeeper, playerName, isHomeTeamButton);
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

  const pullState = getActionButtonState(bookkeeper, 'pull');
  const pointState = getActionButtonState(bookkeeper, 'point');
  const dropState = getActionButtonState(bookkeeper, 'drop');
  const throwawayState = getActionButtonState(bookkeeper, 'throwaway');
  const dState = getActionButtonState(bookkeeper, 'd');
  const catchDState = getActionButtonState(bookkeeper, 'catchD');
  const undoState = getActionButtonState(bookkeeper, 'undo');

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
