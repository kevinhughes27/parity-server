import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoredGame } from './db';
import { Link, useNavigate } from 'react-router-dom';
import { getLeagueName } from '../../api';
import Loading from '../../components/Loading';

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
      return 'primary';
    default:
      return 'default';
  }
};

function Home() {
  const navigate = useNavigate();

  const games = useLiveQuery(() => db.games.orderBy('lastModified').reverse().toArray(), []);
  if (games === undefined) {
    return <Loading />;
  }

  const handleStartNewGame = () => {
    navigate('/stat_keeper/new_game');
  };

  const handleDeleteGame = async (localId: number | undefined) => {
    if (localId === undefined) {
      console.error('Cannot delete game with undefined ID.');
      return;
    }
    const gameToDelete = games?.find(g => g.localId === localId);
    const gameName = gameToDelete
      ? `${gameToDelete.homeTeam} vs ${gameToDelete.awayTeam}`
      : `Game ID ${localId}`;

    const message = `Are you sure you want to delete the game: ${gameName}? This action cannot be undone.`;

    if (window.confirm(message)) {
      try {
        await db.games.delete(localId);
        console.log(`Game with localId: ${localId} deleted successfully.`);
      } catch (error) {
        console.error('Failed to delete game:', error);
        alert(`Failed to delete game: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
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

          <Chip
            label={game.status}
            size="small"
            color={getStatusColor(game.status)}
          />
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
        <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
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
                  color="primary"
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
        <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
          Local Games
        </Typography>
        <Box>
          {games.map(game =>
            renderGameCard(
              game,
              game.localId && (
                <Button
                  size="small"
                  variant="outlined"
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

  // Component for empty state
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

      <Container sx={{ mt: 3 }}>
        <InProgressGamesSection games={resumableGames} />
        <CompletedGamesSection games={otherGames} />
        {games.length === 0 && <EmptyState />}
      </Container>
    </Box>
  );
}

export default Home;
