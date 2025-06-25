import React from 'react';
import { Bookkeeper, GameState } from './bookkeeper';
import PointEventsDisplay from './PointEventsDisplay';
import ActionBar from './ActionBar';
import { Box, Button } from '@mui/material';
import { EventType } from './models';

interface RecordStatsProps {
  bookkeeper: Bookkeeper;
  actionBarHeight: string;
}

const getPlayerButtonState = (
  bookkeeper: Bookkeeper,
  playerName: string,
  isHomeTeam: boolean
): {
  enabled: boolean;
  variant: 'active' | 'enabled' | 'disabled-possession' | 'disabled-no-possession' | 'not-on-line';
  reason?: string;
  style: React.CSSProperties;
} => {
  const isTeamInPossession = isHomeTeam === bookkeeper.homePossession;
  const homePlayersOnActiveLine = bookkeeper.homePlayers || [];
  const awayPlayersOnActiveLine = bookkeeper.awayPlayers || [];
  const isPlayerOnActiveLine = isHomeTeam
    ? homePlayersOnActiveLine.includes(playerName)
    : awayPlayersOnActiveLine.includes(playerName);

  if (!isPlayerOnActiveLine) {
    return {
      enabled: false,
      variant: 'not-on-line',
      reason: 'Player not on active line',
      style: {
        color: '#adb5bd',
        backgroundColor: '#f8f9fa',
        border: '1px solid #eee',
        fontWeight: 'normal',
      },
    };
  }

  const currentGameState = bookkeeper.gameState();
  const isActivePlayer = bookkeeper.firstActor === playerName;
  const isFirstPoint = bookkeeper.firstPoint();
  const isFirstPointAfterHalftime = bookkeeper.firstPointAfterHalf();

  // Special case: first point of game or after halftime, both teams can select who pulls
  if (currentGameState === GameState.Start && (isFirstPoint || isFirstPointAfterHalftime)) {
    return {
      enabled: true,
      variant: isActivePlayer ? 'active' : 'enabled',
      reason: 'Select puller for second half',
      style: isActivePlayer
        ? {
            color: '#000',
            backgroundColor: '#a7d7f5',
            border: '1px solid #2196f3',
            fontWeight: 'bold',
          }
        : {
            color: '#000',
            backgroundColor: isTeamInPossession ? '#e3f2fd' : '#f0f0f0',
            border: isTeamInPossession ? '1px solid #2196f3' : '1px solid #ccc',
            fontWeight: 'normal',
          },
    };
  }

  // Game state specific logic
  if (currentGameState === GameState.Start) {
    // For the start of a point (not first point of game/half), only the receiving team should be enabled
    if (!isFirstPointAfterHalftime && !isTeamInPossession) {
      return {
        enabled: false,
        variant: 'disabled-no-possession',
        reason: 'Other team receives after point scored',
        style: {
          color: '#999',
          backgroundColor: '#e0e0e0',
          border: '1px solid #ccc',
          fontWeight: 'normal',
        },
      };
    }

    return {
      enabled: true,
      variant: isActivePlayer ? 'active' : 'enabled',
      reason: (isFirstPoint || isFirstPointAfterHalftime) ? 'Select starting player' : 'Select receiving player',
      style: isActivePlayer
        ? {
            color: '#000',
            backgroundColor: '#a7d7f5',
            border: '1px solid #2196f3',
            fontWeight: 'bold',
          }
        : {
            color: '#000',
            backgroundColor: isTeamInPossession ? '#e3f2fd' : '#f0f0f0',
            border: isTeamInPossession ? '1px solid #2196f3' : '1px solid #ccc',
            fontWeight: 'normal',
          },
    };
  }

  if (currentGameState === GameState.WhoPickedUpDisc) {
    if (!isTeamInPossession) {
      return {
        enabled: false,
        variant: 'disabled-no-possession',
        reason: 'Other team picks up disc',
        style: {
          color: '#999',
          backgroundColor: '#e0e0e0',
          border: '1px solid #ccc',
          fontWeight: 'normal',
        },
      };
    }
    return {
      enabled: true,
      variant: isActivePlayer ? 'active' : 'enabled',
      reason: 'Select player who picked up disc',
      style: isActivePlayer
        ? {
            color: '#000',
            backgroundColor: '#a7d7f5',
            border: '1px solid #2196f3',
            fontWeight: 'bold',
          }
        : {
            color: '#000',
            backgroundColor: isTeamInPossession ? '#e3f2fd' : '#f0f0f0',
            border: isTeamInPossession ? '1px solid #2196f3' : '1px solid #ccc',
            fontWeight: 'normal',
          },
    };
  }

  if (currentGameState === GameState.Pull) {
    return {
      enabled: false,
      variant: 'disabled-possession',
      reason: 'Pull in progress',
      style: {
        color: '#000',
        backgroundColor: '#90caf9',
        border: '1px solid #2196f3',
        fontWeight: 'normal',
      },
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
          style: {
            color: '#000',
            backgroundColor: '#a7d7f5',
            border: '1px solid #2196f3',
            fontWeight: 'bold',
          },
        };
      } else {
        return {
          enabled: true,
          variant: isActivePlayer ? 'active' : 'enabled',
          reason: isActivePlayer ? 'Player has disc' : 'Select pass target',
          style: isActivePlayer
            ? {
                color: '#000',
                backgroundColor: '#a7d7f5',
                border: '1px solid #2196f3',
                fontWeight: 'bold',
              }
            : {
                color: '#000',
                backgroundColor: isTeamInPossession ? '#e3f2fd' : '#f0f0f0',
                border: isTeamInPossession ? '1px solid #2196f3' : '1px solid #ccc',
                fontWeight: 'normal',
              },
        };
      }
    } else {
      return {
        enabled: false,
        variant: 'disabled-no-possession',
        reason: 'Other team has possession',
        style: {
          color: '#999',
          backgroundColor: '#e0e0e0',
          border: '1px solid #ccc',
          fontWeight: 'normal',
        },
      };
    }
  }

  // Default case
  if (!isTeamInPossession) {
    return {
      enabled: false,
      variant: 'disabled-no-possession',
      reason: 'Other team has possession',
      style: {
        color: '#999',
        backgroundColor: '#e0e0e0',
        border: '1px solid #ccc',
        fontWeight: 'normal',
      },
    };
  }

  return {
    enabled: true,
    variant: 'enabled',
    reason: 'Available for selection',
    style: {
      color: '#000',
      backgroundColor: isTeamInPossession ? '#e3f2fd' : '#f0f0f0',
      border: isTeamInPossession ? '1px solid #2196f3' : '1px solid #ccc',
      fontWeight: 'normal',
    },
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
  const canDrop =
    (currentGameState === GameState.Normal ||
      currentGameState === GameState.FirstThrowQuebecVariant ||
      currentGameState === GameState.FirstD ||
      currentGameState === GameState.SecondD) &&
    bookkeeper.firstActor !== null &&
    // Disable drop for picking up disc after a point (but not after a pull)
    !(
      bookkeeper.activePoint?.getEventCount() === 0 &&
      !bookkeeper.firstPointOfGameOrHalf() &&
      bookkeeper.activePoint?.getLastEventType() !== EventType.PULL
    );

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
        enabled:
          (currentGameState === GameState.Normal || currentGameState === GameState.SecondD) &&
          bookkeeper.firstActor !== null,
        reason:
          bookkeeper.firstActor === null
            ? 'No player selected'
            : currentGameState !== GameState.Normal && currentGameState !== GameState.SecondD
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
        enabled:
          (currentGameState === GameState.Normal ||
            currentGameState === GameState.FirstThrowQuebecVariant ||
            currentGameState === GameState.FirstD ||
            currentGameState === GameState.SecondD) &&
          bookkeeper.firstActor !== null,
        reason:
          bookkeeper.firstActor === null ? 'No player selected' : 'Cannot throw away in current state',
      };

    case 'd':
      return {
        enabled:
          bookkeeper.firstActor !== null &&
          (currentGameState === GameState.FirstD || currentGameState === GameState.SecondD),
        reason:
          bookkeeper.firstActor === null
            ? 'No player selected'
            : currentGameState !== GameState.FirstD && currentGameState !== GameState.SecondD
              ? 'Can only get D after turnover or another D'
              : undefined,
      };

    case 'catchD':
      return {
        enabled:
          bookkeeper.firstActor !== null &&
          (currentGameState === GameState.FirstD || currentGameState === GameState.SecondD),
        reason:
          bookkeeper.firstActor === null
            ? 'No player selected'
            : currentGameState !== GameState.FirstD && currentGameState !== GameState.SecondD
              ? 'Can only get catch D after turnover or another D'
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

const RecordStats: React.FC<RecordStatsProps> = ({ bookkeeper, actionBarHeight }) => {
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
          justifyContent: 'flex-start',
          mb: 0.5,
          py: 1,
          borderRadius: 1,
          fontSize: '0.9em',
          textTransform: 'none',
          ...buttonState.style,
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
          <Box sx={{ width: '30%', pr: 1, overflow: 'auto' }}>
            {fullHomeRoster.map(player => renderPlayerButton(player, true))}
          </Box>

          <Box sx={{ width: '40%' }}>
            <PointEventsDisplay bookkeeper={bookkeeper} />
          </Box>

          <Box sx={{ width: '30%', pl: 1, overflow: 'auto' }}>
            {fullAwayRoster.map(player => renderPlayerButton(player, false))}
          </Box>
        </Box>
      </Box>

      <ActionBar
        actionBarHeight={actionBarHeight}
        primaryActions={[
          {
            label: 'Pull',
            onClick: handlePull,
            disabled: !pullState.enabled,
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
            variant: 'outlined',
          },
          {
            label: 'Throwaway',
            onClick: handleThrowaway,
            disabled: !throwawayState.enabled,
            variant: 'outlined',
          },
          {
            label: 'D (Block)',
            onClick: handleD,
            disabled: !dState.enabled,
            variant: 'outlined',
          },
          {
            label: 'Catch D',
            onClick: handleCatchD,
            disabled: !catchDState.enabled,
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
