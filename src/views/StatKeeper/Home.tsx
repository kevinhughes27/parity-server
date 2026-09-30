import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoredGame } from './db';
import { Link } from 'react-router-dom';
import { getLeagueName } from '../../api';
import Loading from '../../components/Loading';
import Version from './version';
import { useSnackbar } from './notifications';
import { useConfirmDialog } from './confirm';

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Card,
  CardContent,
  CardActions,
  Chip,
} from '@mui/material';

// Helper function to determine chip color based on game status
const getStatusColor = (status: StoredGame['status']) => {
  switch (status) {
    case 'uploaded':
      return 'success';
    case 'sync-error':
      return 'error';
    case 'in-progress':
      return 'info';
    default:
      return 'default';
  }
};

function Home() {
  const { showSnackbar, SnackbarComponent } = useSnackbar({ defaultSeverity: 'success' });
  const { confirm, DialogComponent } = useConfirmDialog();

  const games = useLiveQuery(() => db.games.orderBy('lastModified').reverse().toArray(), []);
  if (games === undefined) {
    return <Loading />;
  }

  const handleStartNewGame = () => {
    // use a hard reload here to:
    // - enforce using the latest code
    // - clear the api cache to ensure fresh rosters
    window.location.href = '/stat_keeper/new_game';
  };

  const handleDeleteGame = async (localId: number | undefined) => {
    if (localId === undefined) {
      console.error('Cannot delete game with undefined ID.');
      return;
    }
    const game = games?.find(g => g.localId === localId);
    const gameName = game ? `${game.homeTeam} vs ${game.awayTeam}` : `Game ID ${localId}`;

    const confirmed = await confirm({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete the game: ${gameName}? This action cannot be undone.`,
      confirmText: 'Delete',
      confirmColor: 'error',
    });

    if (!confirmed) {
      return;
    }

    try {
      await db.games.delete(localId);
      console.log(`Game with localId: ${localId} deleted successfully.`);
      showSnackbar('Game deleted successfully.', 'success');
    } catch (error) {
      console.error('Failed to delete game:', error);
      showSnackbar(
        `Failed to delete game: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  };

  const resumableStatuses: StoredGame['status'][] = ['in-progress'];
  const resumableGames = games.filter(game => resumableStatuses.includes(game.status));
  const otherGames = games.filter(game => !resumableStatuses.includes(game.status));

  // Component to render a single game card
  const renderGameCard = (game: StoredGame, actionButton: React.ReactNode) => (
    <Card
      key={game.localId}
      sx={{
        mb: 2,
        boxShadow: 2,
        position: 'relative',
      }}
    >
      <CardContent>
        <Typography variant="h6" component="div">
          {game.homeTeam} vs {game.awayTeam}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>League:</strong> {getLeagueName(game.league_id)} | <strong>Week:</strong>{' '}
            {game.week}
          </Typography>

          <Chip label={game.status} size="small" color={getStatusColor(game.status)} />
        </Box>

        <Typography variant="body1" sx={{ mt: 1 }}>
          <strong>Score:</strong> {game.homeTeam} {game.homeScore} - {game.awayScore}{' '}
          {game.awayTeam}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <strong>Last Modified:</strong> {game.lastModified.toLocaleString()}
        </Typography>
      </CardContent>

      <CardActions>
        {actionButton}
        <Button
          size="small"
          variant="outlined"
          color="error"
          onClick={() => handleDeleteGame(game.localId)}
        >
          Delete
        </Button>
      </CardActions>
    </Card>
  );

  // Component for the app header
  const AppHeader = () => (
    <AppBar position="static" color="primary" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'white' }}>
          StatKeeper
        </Typography>
        <Button
          color="inherit"
          variant="outlined"
          onClick={handleStartNewGame}
          sx={{ ml: 2, color: 'white' }}
        >
          Start New Game
        </Button>
      </Toolbar>
    </AppBar>
  );

  // Component to render a section of in-progress games
  const InProgressGamesSection = ({ games }: { games: StoredGame[] }) => {
    if (games.length === 0) return null;

    return (
      <>
        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
          In Progress
        </Typography>
        <Box>
          {games.map(game =>
            renderGameCard(
              game,
              game.localId && (
                <Button
                  size="small"
                  variant="contained"
                  color="info"
                  component={Link}
                  to={`/stat_keeper/game/${game.localId}`}
                >
                  Resume Game
                </Button>
              )
            )
          )}
        </Box>
      </>
    );
  };

  // Component to render a section of completed games
  const CompletedGamesSection = ({ games }: { games: StoredGame[] }) => {
    if (games.length === 0) return null;

    return (
      <>
        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
          Complete
        </Typography>
        <Box>
          {games.map(game =>
            renderGameCard(
              game,
              game.localId && (
                <Button
                  size="small"
                  variant="outlined"
                  color="info"
                  component={Link}
                  to={`/stat_keeper/game/${game.localId}`}
                >
                  View Game
                </Button>
              )
            )
          )}
        </Box>
      </>
    );
  };

  const Preamble = () => (
    <Box sx={{ mt: 4 }}>
      <Typography variant="body2">
        <strong>These games are stored locally in the browser's indexedDB.</strong>
        They can be deleted after they have been submitted but there is no need to. They will be
        cleared automatically if the database schema is updated.
      </Typography>
    </Box>
  );

  const EmptyState = () => (
    <Box sx={{ mt: 4, textAlign: 'center' }}>
      <Typography variant="body1">
        No games stored locally. Click "Start New Game" to begin.
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppHeader />

      <Container sx={{ mt: 3, pb: 4 }}>
        {games.length !== 0 && <Preamble />}
        <InProgressGamesSection games={resumableGames} />
        <CompletedGamesSection games={otherGames} />
        {games.length === 0 && <EmptyState />}
      </Container>

      <Version />
      {DialogComponent}
      {SnackbarComponent}
    </Box>
  );
}

export default Home;
