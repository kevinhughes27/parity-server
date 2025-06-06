import React from 'react';
import { GameState } from './models';
import { Bookkeeper } from './bookkeeper';
import PointEventsDisplay from './PointEventsDisplay';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Grid, 
  Stack
} from '@mui/material';

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
  onChangeLine,
  actionBarHeight,
}) => {
  const currentGameState = bookkeeper.gameState();
  const homePlayersOnActiveLine = bookkeeper.homePlayers || [];
  const awayPlayersOnActiveLine = bookkeeper.awayPlayers || [];
  const playByPlay = bookkeeper.getCurrentPointPrettyPrint();

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
            textTransform: 'none'
          }}
        >
          {playerName}
        </Button>
      );
    }

    let isDisabledByGameState = false;
    const isActivePlayer = bookkeeper.firstActor === playerName;

    if (currentGameState === GameState.Start) {
      isDisabledByGameState = false;
    } else if (currentGameState === GameState.WhoPickedUpDisc) {
      isDisabledByGameState = !(isHomeTeamButton === bookkeeper.homePossession);
    } else if (currentGameState === GameState.Pull) {
      isDisabledByGameState = true;
    } else if (bookkeeper.firstActor !== null) {
      if (isHomeTeamButton === bookkeeper.homePossession) {
        if (isActivePlayer && bookkeeper.shouldRecordNewPass()) {
          isDisabledByGameState = true;
        } else {
          isDisabledByGameState = false;
        }
      } else {
        isDisabledByGameState = true;
      }
    } else {
      isDisabledByGameState = !(isHomeTeamButton === bookkeeper.homePossession);
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
          backgroundColor: finalIsDisabled ? '#e0e0e0' : isActivePlayer ? '#a7d7f5' : '#f0f0f0',
          color: finalIsDisabled ? '#999' : '#000',
          border: '1px solid #ccc',
          borderRadius: 1,
          fontWeight: isActivePlayer ? 'bold' : 'normal',
          fontSize: '0.9em',
          textTransform: 'none'
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
        <Paper 
          elevation={0} 
          sx={{ 
            p: 1, 
            backgroundColor: '#f9f9f9', 
            borderRadius: 1, 
            textAlign: 'center', 
            mb: 1.25,
            fontSize: '0.9em'
          }}
        >
          <Typography variant="body2">
            <strong>Possession:</strong>{' '}
            {bookkeeper.homePossession ? bookkeeper.homeTeam.name : bookkeeper.awayTeam.name}
            {bookkeeper.firstActor && ` (Disc with: ${bookkeeper.firstActor})`}
          </Typography>
          <Typography variant="body2">
            <strong>Game State:</strong> {GameState[currentGameState]}
          </Typography>
        </Paper>
        
        <Grid container spacing={1} sx={{ minHeight: '200px' }}>
          <Grid item xs={4} sx={{ height: '100%', overflow: 'auto' }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
              {bookkeeper.homeTeam.name} (Roster)
            </Typography>
            {fullHomeRoster.map(player =>
              renderPlayerButton(player, true, homePlayersOnActiveLine.includes(player))
            )}
          </Grid>
          
          <Grid item xs={4}>
            <PointEventsDisplay title="Play by Play (Current Point)" events={playByPlay} />
          </Grid>
          
          <Grid item xs={4} sx={{ height: '100%', overflow: 'auto' }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
              {bookkeeper.awayTeam.name} (Roster)
            </Typography>
            {fullAwayRoster.map(player =>
              renderPlayerButton(player, false, awayPlayersOnActiveLine.includes(player))
            )}
          </Grid>
        </Grid>
      </Box>

      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: actionBarHeight,
          p: '5px 10px',
          backgroundColor: 'white',
          borderTop: '1px solid #ccc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          boxSizing: 'border-box',
          zIndex: 100,
        }}
      >
        <Stack direction="row" spacing={0.5} flexWrap="wrap" alignItems="center">
          <Button
            onClick={() => handleActionClick(bk => bk.recordPull())}
            disabled={!btnPullEnabled}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.85em', minWidth: '60px' }}
          >
            Pull
          </Button>
          <Button
            onClick={handlePointClick}
            disabled={!btnPointEnabled}
            size="small"
            variant="contained"
            color="success"
            sx={{ fontSize: '0.85em', minWidth: '60px' }}
          >
            Point!
          </Button>
          <Button
            onClick={() => handleActionClick(bk => bk.recordDrop())}
            disabled={!btnDropEnabled}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.85em', minWidth: '60px' }}
          >
            Drop
          </Button>
          <Button
            onClick={() => handleActionClick(bk => bk.recordThrowAway())}
            disabled={!btnThrowAwayEnabled}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.85em', minWidth: '60px' }}
          >
            Throwaway
          </Button>
          <Button
            onClick={() => {
              if (!bookkeeper.firstActor) {
                alert('Select the player who got the D first.');
                return;
              }
              handleActionClick(bk => bk.recordD());
            }}
            disabled={!btnDEnabled}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.85em', minWidth: '60px' }}
          >
            D (Block)
          </Button>
          <Button
            onClick={() => {
              if (!bookkeeper.firstActor) {
                alert('Select the player who got the Catch D first.');
                return;
              }
              handleActionClick(bk => bk.recordCatchD());
            }}
            disabled={!btnCatchDEnabled}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.85em', minWidth: '60px' }}
          >
            Catch D
          </Button>
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center">
          <Button 
            onClick={onChangeLine} 
            size="small" 
            variant="outlined"
            sx={{ fontSize: '0.85em' }}
          >
            Change Line
          </Button>
          <Button
            onClick={() => handleActionClick(bk => bk.undo())}
            disabled={!btnUndoEnabled}
            size="small"
            variant="contained"
            color="warning"
            sx={{ fontSize: '0.85em' }}
          >
            Undo
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default RecordStats;
