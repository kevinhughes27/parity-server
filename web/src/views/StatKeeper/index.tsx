import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoredGame } from '../../db'; // Ensure this path is correct
import { Link } from 'react-router-dom';
import { leagues } from '../../api'; // To display league name

// Helper function to get league name from ID
const getLeagueName = (leagueId: string): string => {
  const league = leagues.find(l => l.id === leagueId);
  return league ? league.name : `Unknown League (${leagueId})`;
};

function StatKeeper() {
  // Fetch games from Dexie, ordered by lastModified descending
  // This query will automatically update when the underlying data changes
  const games = useLiveQuery(
    () => db.games.orderBy('lastModified').reverse().toArray(),
    [] // Dependencies array for useLiveQuery; empty means it only depends on db.games table changes
  );

  const handleStartNewGame = async () => {
    console.log('Start New Game clicked');
    
    try {
      // For a real app, you'd likely navigate to a form to get these details
      const newGameData: Omit<StoredGame, 'localId' | 'points' | 'homeScore' | 'awayScore' | 'homeRoster' | 'awayRoster' | 'stats'> = {
        serverId: undefined, 
        league_id: leagues.length > 0 ? leagues[0].id : "default_league", 
        week: 1, 
        homeTeam: 'New Home Team', // Placeholder
        awayTeam: 'New Away Team', // Placeholder
        status: 'new',
        lastModified: new Date(),
        // Initialize empty/default values for other required fields from StoredGame
        points: [],
        homeScore: 0,
        awayScore: 0,
        homeRoster: [],
        awayRoster: [],
      };
      // Dexie's add method expects all non-optional fields or a fully typed StoredGame.
      // Casting to StoredGame if Omit doesn't satisfy all required fields.
      const id = await db.games.add(newGameData as StoredGame); 
      console.log(`New game added with localId: ${id}`);
      // Optionally, navigate to the game editing page:
      // history.push(`/stat_keeper/game/${id}`); // If using useHistory hook
    } catch (error) {
      console.error("Failed to add new game:", error);
      // Handle error (e.g., show a notification to the user)
    }
  };

  if (games === undefined) {
    // useLiveQuery returns undefined on first render before the query completes
    return <p>Loading local games...</p>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>StatKeeper</h1>
      <button onClick={handleStartNewGame} style={{ marginBottom: '20px', padding: '10px 15px', fontSize: '16px' }}>
        Start New Game
      </button>

      <h2>Locally Stored Games</h2>
      {games.length === 0 ? (
        <p>No games stored locally. Click "Start New Game" to begin.</p>
      ) : (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {games.map((game) => (
            <li key={game.localId} style={{ marginBottom: '15px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }}>
              <h3>{game.homeTeam} vs {game.awayTeam}</h3>
              <p style={{ margin: '5px 0' }}>
                <strong>League:</strong> {getLeagueName(game.league_id)} | <strong>Week:</strong> {game.week}
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>Status:</strong> <span style={{ fontWeight: 'bold', color: game.status === 'in-progress' ? 'green' : (game.status === 'completed' || game.status === 'submitted' ? 'blue' : 'black') }}>{game.status}</span>
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>Score:</strong> {game.homeTeam} {game.homeScore} - {game.awayScore} {game.awayTeam}
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>Last Modified:</strong> {game.lastModified.toLocaleString()}
              </p>
              
              {(game.status === 'new' || game.status === 'in-progress' || game.status === 'paused') && (
                <Link to={`/stat_keeper/game/${game.localId}`}>
                  <button style={{ marginTop: '10px', padding: '8px 12px', cursor: 'pointer' }}>Resume Game</button>
                </Link>
              )}
              {/* You could add other actions here, e.g., View Details, Delete (with confirmation) */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default StatKeeper;
