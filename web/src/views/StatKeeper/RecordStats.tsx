import React from 'react';
import { GameState } from './models';
import { Bookkeeper } from './bookkeeper';
import PointEventsDisplay from './PointEventsDisplay';
import ActionBar from './ActionBar';
import { Box, Button } from '@mui/material';

interface RecordStatsProps {
  bookkeeper: Bookkeeper;
  fullHomeRoster: string[]; // Assumed to be pre-sorted by parent (LocalGame)
  fullAwayRoster: string[]; // Assumed to be pre-sorted by parent (LocalGame)
  onPerformAction: (
    action: (bk: Bookkeeper) => void,
    options?: { skipViewChange?: boolean; skipSave?: boolean }
  ) => Promise<void>;
  onPointScored: () => void;
  onChangeLine: () => void;
  actionBarHeight: string; // Added prop
}

const RecordStats: React.FC<RecordStatsProps> = ({
  bookkeeper,
  fullHomeRoster, // Already sorted
  fullAwayRoster, // Already sorted
  onPerformAction,
  onPointScored,
  actionBarHeight,
}) => {
  const currentGameState = bookkeeper.gameState();
  const homePlayersOnActiveLine = bookkeeper.homePlayers || [];
  const awayPlayersOnActiveLine = bookkeeper.awayPlayers || [];

  const handlePlayerClick = async (playerName: string, isHomeTeamPlayer: boolean) => {
    if (bookkeeper.shouldRecordNewPass()) {
      await onPerformAction(bk => bk.recordPass(playerName));
    } else {
      await onPerformAction(bk => bk.recordFirstActor(playerName, isHomeTeamPlayer));
    }
  };

  const handleActionClick = async (actionFunc: (bk: Bookkeeper) => void) => {
    await onPerformAction(actionFunc);
  };

  const handlePointClick = async () => {
    await onPerformAction(bk => bk.recordPoint(), { skipViewChange: true });
    onPointScored();
  };

  const renderPlayerButton = (
    playerName: string,
    isHomeTeamButton: boolean,
    isPlayerOnActiveLine: boolean
  ) => {
    if (!isPlayerOnActiveLine) {
      return (
        <Button
          key={playerName}
          disabled
          fullWidth
          variant="text"
          size="small"
          sx={{
            justifyContent: 'flex-start',
            mb: 0.5,
            py: 1,
            color: '#adb5bd',
            backgroundColor: '#f8f9fa',
            border: '1px solid #eee',
            borderRadius: 1,
            fontWeight: 'normal',
            fontSize: '0.9em',
            textTransform: 'none',
          }}
        >
          {playerName}
        </Button>
      );
    }

    let isDisabledByGameState = false;
    const isActivePlayer = bookkeeper.firstActor === playerName;
    const isTeamInPossession = isHomeTeamButton === bookkeeper.homePossession;

    if (currentGameState === GameState.Start) {
      isDisabledByGameState = false;
    } else if (currentGameState === GameState.WhoPickedUpDisc) {
      isDisabledByGameState = !isTeamInPossession;
    } else if (currentGameState === GameState.Pull) {
      isDisabledByGameState = true;
    } else if (bookkeeper.firstActor !== null) {
      if (isTeamInPossession) {
        if (isActivePlayer && bookkeeper.shouldRecordNewPass()) {
          isDisabledByGameState = true;
        } else {
          isDisabledByGameState = false;
        }
      } else {
        isDisabledByGameState = true;
      }
    } else {
      isDisabledByGameState = !isTeamInPossession;
    }

    const finalIsDisabled = isDisabledByGameState;

    return (
      <Button
        key={playerName}
        onClick={() => handlePlayerClick(playerName, isHomeTeamButton)}
        disabled={finalIsDisabled}
        fullWidth
        variant="text"
        size="small"
        sx={{
          justifyContent: 'flex-start',
          mb: 0.5,
          py: 1,
          backgroundColor: finalIsDisabled
            ? isTeamInPossession
              ? '#90caf9'
              : '#e0e0e0' // Darker blue for disabled team in possession
            : isActivePlayer
              ? '#a7d7f5'
              : isTeamInPossession
                ? '#e3f2fd' // Light blue background for team in possession
                : '#f0f0f0',
          color: finalIsDisabled ? (isTeamInPossession ? '#000' : '#999') : '#000',
          border: isTeamInPossession ? '1px solid #2196f3' : '1px solid #ccc', // Blue border for team in possession
          borderRadius: 1,
          fontWeight: isActivePlayer ? 'bold' : 'normal',
          fontSize: '0.9em',
          textTransform: 'none',
        }}
      >
        {playerName}
      </Button>
    );
  };

  const btnPullEnabled = currentGameState === GameState.Pull && bookkeeper.firstActor !== null;
  const btnPointEnabled =
    (currentGameState === GameState.Normal || currentGameState === GameState.SecondD) &&
    bookkeeper.firstActor !== null;
  const btnDropEnabled =
    (currentGameState === GameState.Normal ||
      currentGameState === GameState.FirstThrowQuebecVariant ||
      currentGameState === GameState.FirstD ||
      currentGameState === GameState.SecondD) &&
    bookkeeper.firstActor !== null;
  const btnThrowAwayEnabled =
    (currentGameState === GameState.Normal ||
      currentGameState === GameState.FirstThrowQuebecVariant ||
      currentGameState === GameState.FirstD ||
      currentGameState === GameState.SecondD) &&
    bookkeeper.firstActor !== null;

  const btnDEnabled =
    bookkeeper.firstActor !== null &&
    (currentGameState === GameState.FirstD || currentGameState === GameState.SecondD);
  const btnCatchDEnabled =
    bookkeeper.firstActor !== null &&
    (currentGameState === GameState.FirstD || currentGameState === GameState.SecondD);

  const btnUndoEnabled = bookkeeper.getMementosCount() > 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1.25 }}>
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', height: '100%' }}>
          <Box sx={{ width: '30%', pr: 1, overflow: 'auto' }}>
            {fullHomeRoster.map(player =>
              renderPlayerButton(player, true, homePlayersOnActiveLine.includes(player))
            )}
          </Box>

          <Box sx={{ width: '40%' }}>
            <PointEventsDisplay bookkeeper={bookkeeper} />
          </Box>

          <Box sx={{ width: '30%', pl: 1, overflow: 'auto' }}>
            {fullAwayRoster.map(player =>
              renderPlayerButton(player, false, awayPlayersOnActiveLine.includes(player))
            )}
          </Box>
        </Box>
      </Box>

      <ActionBar
        actionBarHeight={actionBarHeight}
        primaryActions={[
          {
            label: 'Pull',
            onClick: () => handleActionClick(bk => bk.recordPull()),
            disabled: !btnPullEnabled,
            variant: 'outlined',
          },
          {
            label: 'Point!',
            onClick: handlePointClick,
            disabled: !btnPointEnabled,
            color: 'success',
            variant: 'contained',
          },
          {
            label: 'Drop',
            onClick: () => handleActionClick(bk => bk.recordDrop()),
            disabled: !btnDropEnabled,
            variant: 'outlined',
          },
          {
            label: 'Throwaway',
            onClick: () => handleActionClick(bk => bk.recordThrowAway()),
            disabled: !btnThrowAwayEnabled,
            variant: 'outlined',
          },
          {
            label: 'D (Block)',
            onClick: () => {
              if (!bookkeeper.firstActor) {
                alert('Select the player who got the D first.');
                return;
              }
              handleActionClick(bk => bk.recordD());
            },
            disabled: !btnDEnabled,
            variant: 'outlined',
          },
          {
            label: 'Catch D',
            onClick: () => {
              if (!bookkeeper.firstActor) {
                alert('Select the player who got the Catch D first.');
                return;
              }
              handleActionClick(bk => bk.recordCatchD());
            },
            disabled: !btnCatchDEnabled,
            variant: 'outlined',
          },
        ]}
        secondaryActions={[
          {
            label: 'Undo',
            onClick: () => handleActionClick(bk => bk.undo()),
            disabled: !btnUndoEnabled,
            color: 'warning',
            variant: 'contained',
          },
        ]}
      />
    </Box>
  );
};

export default RecordStats;
