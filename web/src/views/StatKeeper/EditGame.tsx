import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, StoredGame } from './db';
import { getLeagueName } from '../../api';
import EditRoster from './EditRoster';
import { useLocalGame, useTeams } from './hooks';
import { AppBar, Toolbar, Box, Typography } from '@mui/material';

const ACTION_BAR_HEIGHT = '70px'; // Consistent height for the bottom action bar

function EditGame() {
  const navigate = useNavigate();
  const { game, isLoading: isLoadingGame, error: gameError, numericGameId } = useLocalGame();
  const {
    allLeaguePlayers, // Already sorted from useTeams
    loadingTeams: loadingLeaguePlayers,
    errorTeams: errorLeaguePlayers,
  } = useTeams(game?.league_id);

  const [homeRosterNames, setHomeRosterNames] = useState<string[]>([]);
  const [awayRosterNames, setAwayRosterNames] = useState<string[]>([]);

  const sortAndSetHomeRoster = (roster: string[]) => {
    setHomeRosterNames([...roster].sort((a, b) => a.localeCompare(b)));
  };

  const sortAndSetAwayRoster = (roster: string[]) => {
    setAwayRosterNames([...roster].sort((a, b) => a.localeCompare(b)));
  };

  useEffect(() => {
    if (game) {
      sortAndSetHomeRoster([...game.homeRoster]);
      sortAndSetAwayRoster([...game.awayRoster]);
    } else {
      sortAndSetHomeRoster([]);
      sortAndSetAwayRoster([]);
    }
  }, [game]);

  const handleUpdateRosters = async () => {
    if (!game || numericGameId === undefined) {
      alert('Game data is not loaded correctly.');
      return;
    }
    if (homeRosterNames.length === 0 || awayRosterNames.length === 0) {
      alert('Rosters cannot be empty.');
      return;
    }

    const updatedGameData: Partial<StoredGame> = {
      homeRoster: [...homeRosterNames].sort((a, b) => a.localeCompare(b)), // Ensure sorted on save
      awayRoster: [...awayRosterNames].sort((a, b) => a.localeCompare(b)), // Ensure sorted on save
      lastModified: new Date(),
    };

    try {
      await db.games.update(numericGameId, updatedGameData);
      console.log(`Rosters for game localId: ${numericGameId} updated successfully.`);
      navigate(`/stat_keeper/game/${numericGameId}`);
    } catch (error) {
      console.error('Failed to update rosters:', error);
      alert(
        `Failed to update rosters: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  if (isLoadingGame) {
    return (
      <div style={{ padding: '20px', height: '100vh', boxSizing: 'border-box' }}>
        <p>Loading game details...</p>
      </div>
    );
  }

  if (gameError) {
    return (
      <div style={{ padding: '20px', height: '100vh', boxSizing: 'border-box' }}>
        <p style={{ color: 'red' }}>{gameError}</p>
        <Link to="/stat_keeper">&larr; Back to StatKeeper Home</Link>
      </div>
    );
  }

  if (!game) {
    return (
      <div style={{ padding: '20px', height: '100vh', boxSizing: 'border-box' }}>
        <p>Game not found or ID is invalid.</p>
        <Link to="/stat_keeper">&larr; Back to StatKeeper Home</Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top Bar with AppBar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Link
            to={`/stat_keeper/game/${numericGameId}`}
            style={{ fontSize: '0.9em', textDecoration: 'none', color: 'inherit' }}
          >
            &larr; Back to Game
          </Link>
        </Toolbar>
        <Box sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="h5" sx={{ fontSize: '1.5em', mb: 0.5 }}>
            Edit Rosters: {game.homeTeam} vs {game.awayTeam}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.9em', mb: 0.5 }}>
            <strong>League:</strong> {getLeagueName(game.league_id)}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.9em' }}>
            <strong>Week:</strong> {game.week}
          </Typography>
        </Box>
      </AppBar>

      {/* Main Content Area (Scrollable Roster Columns) */}
      <div
        style={{
          flexGrow: 1,
          display: 'flex',
          overflow: 'hidden', // Prevent this div from scrolling, children will scroll
          padding: '10px', // Add some padding around the roster editors
          paddingBottom: ACTION_BAR_HEIGHT, // Space for the fixed bottom bar
          gap: '10px', // Space between the two roster columns
        }}
      >
        {loadingLeaguePlayers && (
          <p style={{ flex: 1, textAlign: 'center' }}>Loading league player data...</p>
        )}
        {errorLeaguePlayers && (
          <p style={{ color: 'red', flex: 1, textAlign: 'center' }}>
            Error loading league players: {errorLeaguePlayers}
          </p>
        )}

        {!loadingLeaguePlayers && !errorLeaguePlayers && allLeaguePlayers.length > 0 && (
          <>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <EditRoster
                teamName={game.homeTeam}
                allLeaguePlayers={allLeaguePlayers} // Already sorted from useTeams
                currentRosterNames={homeRosterNames} // Already sorted by sortAndSetHomeRoster
                onRosterChange={sortAndSetHomeRoster} // Pass the sorting setter
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <EditRoster
                teamName={game.awayTeam}
                allLeaguePlayers={allLeaguePlayers} // Already sorted from useTeams
                currentRosterNames={awayRosterNames} // Already sorted by sortAndSetAwayRoster
                onRosterChange={sortAndSetAwayRoster} // Pass the sorting setter
              />
            </div>
          </>
        )}
        {!loadingLeaguePlayers &&
          !errorLeaguePlayers &&
          allLeaguePlayers.length === 0 &&
          game?.league_id && (
            <p style={{ flex: 1, textAlign: 'center' }}>
              No players found for the league: {getLeagueName(game.league_id)}.
            </p>
          )}
      </div>

      {/* Fixed Bottom Action Bar */}
      {!loadingLeaguePlayers && !errorLeaguePlayers && allLeaguePlayers.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: ACTION_BAR_HEIGHT,
            padding: '10px 15px',
            backgroundColor: 'white',
            borderTop: '1px solid #ccc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center', // Center the button
            boxSizing: 'border-box',
            zIndex: 100,
          }}
        >
          <button
            onClick={handleUpdateRosters}
            style={{
              padding: '10px 20px',
              fontSize: '1em',
              cursor: 'pointer',
              backgroundColor: 'blue',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
            }}
            disabled={homeRosterNames.length === 0 || awayRosterNames.length === 0}
          >
            Update Rosters
          </button>
        </div>
      )}
    </div>
  );
}

export default EditGame;
