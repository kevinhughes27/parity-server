import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, StoredGame } from './db';
import { getLeagueName, fetchTeams, TeamPlayer } from '../../api';
import EditRoster from './EditRoster';
import { useLocalGame, GAME_LOADING_SENTINEL } from './useLocalGame';

function EditGame() {
  const navigate = useNavigate();
  // Use the custom hook to load game data
  const { game, isLoading: isLoadingGame, error: gameError, numericGameId, rawGameData } = useLocalGame();

  const [homeRosterNames, setHomeRosterNames] = useState<string[]>([]);
  const [awayRosterNames, setAwayRosterNames] = useState<string[]>([]);
  const [allLeaguePlayers, setAllLeaguePlayers] = useState<TeamPlayer[]>([]);
  const [loadingLeaguePlayers, setLoadingLeaguePlayers] = useState<boolean>(false);
  const [errorLeaguePlayers, setErrorLeaguePlayers] = useState<string | null>(null);

  // Effect to fetch league players when game data is available (or changes)
  useEffect(() => {
    // rawGameData is used here because it reflects the direct output of useLiveQuery,
    // including the sentinel, which helps manage the loading sequence correctly.
    if (rawGameData && rawGameData !== GAME_LOADING_SENTINEL && rawGameData.league_id) {
      const currentGame = rawGameData as StoredGame; // Safe assertion after checks
      setLoadingLeaguePlayers(true);
      setErrorLeaguePlayers(null);
      fetchTeams(currentGame.league_id)
        .then(teams => {
          const allPlayers = teams.reduce((acc, team) => {
            team.players.forEach(p => {
              if (!acc.find(ap => ap.name === p.name)) {
                acc.push(p);
              }
            });
            return acc;
          }, [] as TeamPlayer[]);
          setAllLeaguePlayers(allPlayers);
        })
        .catch(err => {
          setErrorLeaguePlayers(err instanceof Error ? err.message : 'Failed to load league players');
          setAllLeaguePlayers([]);
        })
        .finally(() => {
          setLoadingLeaguePlayers(false);
        });
    } else if (!rawGameData || rawGameData === GAME_LOADING_SENTINEL) {
      // Reset if game is not loaded or is still loading
      setAllLeaguePlayers([]);
      setErrorLeaguePlayers(null); // Clear previous league player errors
    }
  }, [rawGameData]); // Dependency on rawGameData ensures this runs when game data changes

  // Effect to initialize/update component's roster states when the resolved 'game' object changes
  useEffect(() => {
    if (game) { // 'game' is the fully resolved StoredGame object from the hook
      setHomeRosterNames([...game.homeRoster]);
      setAwayRosterNames([...game.awayRoster]);
    } else {
      // Reset rosters if game is not available (e.g., loading, error, or not found)
      setHomeRosterNames([]);
      setAwayRosterNames([]);
    }
  }, [game]); // Dependency on the resolved 'game' object

  const handleUpdateRosters = async () => {
    if (!game || numericGameId === undefined) { // Check against 'game' from hook
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
    // This state should also generally be covered by 'gameError' if an ID was present.
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
      {errorLeaguePlayers && <p style={{ color: 'red' }}>Error: {errorLeaguePlayers}</p>}

      {!loadingLeaguePlayers && !errorLeaguePlayers && (
        <>
          <EditRoster
            teamName={game.homeTeam}
            allLeaguePlayers={allLeaguePlayers}
            currentRosterNames={homeRosterNames}
            onRosterChange={setHomeRosterNames}
          />
          <EditRoster
            teamName={game.awayTeam}
            allLeaguePlayers={allLeaguePlayers}
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
    </div>
  );
}

export default EditGame;
