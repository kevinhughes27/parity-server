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
  const isFirstPointAfterHalftime = bookkeeper.firstPointOfGameOrHalf() && bookkeeper.pointsAtHalf > 0;

  // Special case: after halftime, both teams can select who pulls
  if (currentGameState === GameState.Start && isFirstPointAfterHalftime) {
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
    return {
      enabled: true,
      variant: isActivePlayer ? 'active' : 'enabled',
      reason: 'Select starting player',
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
        enabled: bookkeeper.getMementosCount() > 0,
        reason: bookkeeper.getMementosCount() === 0 ? 'No actions to undo' : undefined,
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
      await bookkeeper.performAction(bk => bk.recordPass(playerName));
    } else {
      await bookkeeper.performAction(bk => bk.recordFirstActor(playerName, isHomeTeamPlayer));
    }
  };

  const handleActionClick = async (actionFunc: (bk: Bookkeeper) => void) => {
    await bookkeeper.performAction(actionFunc);
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
            onClick: () => handleActionClick(bk => bk.recordPull()),
            disabled: !pullState.enabled,
            variant: 'outlined',
          },
          {
            label: 'Point!',
            onClick: () => handleActionClick(bk => bk.recordPoint()),
            disabled: !pointState.enabled,
            color: 'success',
            variant: 'contained',
          },
          {
            label: 'Drop',
            onClick: () => handleActionClick(bk => bk.recordDrop()),
            disabled: !dropState.enabled,
            variant: 'outlined',
          },
          {
            label: 'Throwaway',
            onClick: () => handleActionClick(bk => bk.recordThrowAway()),
            disabled: !throwawayState.enabled,
            variant: 'outlined',
          },
          {
            label: 'D (Block)',
            onClick: () => {
              if (!bookkeeper.firstActor) {
                // we never see this and we don't want to.
                // and at least for me the confusing part is to do the throwaway first
                alert('Select the player who got the D first.');
                return;
              }
              handleActionClick(bk => bk.recordD());
            },
            disabled: !dState.enabled,
            variant: 'outlined',
          },
          {
            label: 'Catch D',
            onClick: () => {
              if (!bookkeeper.firstActor) {
                // we never see this and we don't want to.
                // and at least for me the confusing part is to do the throwaway first
                alert('Select the player who got the Catch D first.');
                return;
              }
              handleActionClick(bk => bk.recordCatchD());
            },
            disabled: !catchDState.enabled,
            variant: 'outlined',
          },
        ]}
        secondaryActions={[
          {
            label: 'Undo',
            onClick: () => handleActionClick(bk => bk.undo()),
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
