import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, StoredGame } from './db';
import { getLeagueName } from '../../api'; // fetchTeams and TeamPlayer are no longer directly needed
import EditRoster from './EditRoster';
import { useLocalGame, useTeams } from './hooks'; // Removed GAME_LOADING_SENTINEL, added useTeams

function EditGame() {
  const navigate = useNavigate();
  // Use the custom hook to load game data
  const { game, isLoading: isLoadingGame, error: gameError, numericGameId } = useLocalGame();

  // Use the useTeams hook to get all league players based on the game's league_id
  // Pass game?.league_id to handle the case where game is initially undefined
  const { 
    allLeaguePlayers, 
    loadingTeams: loadingLeaguePlayers, 
    errorTeams: errorLeaguePlayers 
  } = useTeams(game?.league_id);

  const [homeRosterNames, setHomeRosterNames] = useState<string[]>([]);
  const [awayRosterNames, setAwayRosterNames] = useState<string[]>([]);

  // Effect to initialize/update component's roster states when the 'game' object changes
  useEffect(() => {
    if (game) {
      setHomeRosterNames([...game.homeRoster]);
      setAwayRosterNames([...game.awayRoster]);
    } else {
      // Reset rosters if game is not available (e.g., loading, error, or not found)
      setHomeRosterNames([]);
      setAwayRosterNames([]);
    }
  }, [game]); // Dependency on the resolved 'game' object

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
      homeRoster: homeRosterNames,
      awayRoster: awayRosterNames,
      lastModified: new Date(),
    };

    try {
      await db.games.update(numericGameId, updatedGameData);
      console.log(`Rosters for game localId: ${numericGameId} updated successfully.`);
      navigate(`/stat_keeper/game/${numericGameId}`);
    } catch (error) {
      console.error("Failed to update rosters:", error);
      alert(`Failed to update rosters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (isLoadingGame) {
    return <p style={{ padding: '20px' }}>Loading game details...</p>;
  }

  if (gameError) {
    return (
      <div style={{ padding: '20px' }}>
        <p>{gameError}</p>
        <Link to="/stat_keeper">&larr; Back to StatKeeper Home</Link>
      </div>
    );
  }

  if (!game) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Game not found or ID is invalid.</p>
        <Link to="/stat_keeper">&larr; Back to StatKeeper Home</Link>
      </div>
    );
  }

  // If we reach here, game is loaded
  return (
    <div style={{ padding: '20px', paddingBottom: '40px' }}>
      <Link to={`/stat_keeper/game/${numericGameId}`} style={{ marginBottom: '20px', display: 'inline-block' }}>
        &larr; Back to Game
      </Link>
      <h1>Edit Game Rosters: {game.homeTeam} vs {game.awayTeam}</h1>
      <div style={{ marginBottom: '20px', backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
        <p><strong>League:</strong> {getLeagueName(game.league_id)}</p>
        <p><strong>Week:</strong> {game.week}</p>
      </div>

      {loadingLeaguePlayers && <p>Loading league player data...</p>}
      {errorLeaguePlayers && <p style={{ color: 'red' }}>Error loading league players: {errorLeaguePlayers}</p>}

      {!loadingLeaguePlayers && !errorLeaguePlayers && (
        <>
          <EditRoster
            teamName={game.homeTeam}
            allLeaguePlayers={allLeaguePlayers} // Provided by useTeams
            currentRosterNames={homeRosterNames}
            onRosterChange={setHomeRosterNames}
          />
          <EditRoster
            teamName={game.awayTeam}
            allLeaguePlayers={allLeaguePlayers} // Provided by useTeams
            currentRosterNames={awayRosterNames}
            onRosterChange={setAwayRosterNames}
          />
          <button
            onClick={handleUpdateRosters}
            style={{ marginBottom: '20px', padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: 'blue', color: 'white', border: 'none', borderRadius: '5px' }}
            disabled={homeRosterNames.length === 0 || awayRosterNames.length === 0 || loadingLeaguePlayers}
          >
            Update Rosters
          </button>
        </>
      )}
      {/* Display if league players are loaded but the list is empty (e.g. league has no players) */}
      {!loadingLeaguePlayers && !errorLeaguePlayers && allLeaguePlayers.length === 0 && game?.league_id && (
         <p>No players found for the league: {getLeagueName(game.league_id)}.</p>
      )}
    </div>
  );
}

export default EditGame;
