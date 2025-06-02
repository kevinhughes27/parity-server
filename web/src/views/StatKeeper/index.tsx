import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoredGame } from '../../db'; // Ensure this path is correct
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { leagues } from '../../api'; // To display league name

// Helper function to get league name from ID
const getLeagueName = (leagueId: string): string => {
  const league = leagues.find(l => l.id === leagueId);
  return league ? league.name : `Unknown League (${leagueId})`;
};

function StatKeeper() {
  const navigate = useNavigate(); // Hook for navigation

  const games = useLiveQuery(
    () => db.games.orderBy('lastModified').reverse().toArray(),
    []
  );

  const handleStartNewGame = () => {
    // Navigate to the new game setup screen
    navigate('/stat_keeper/new_game');
  };

  if (games === undefined) {
    return <p>Loading local games...</p>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>StatKeeper</h1>
      <button 
        onClick={handleStartNewGame} 
        style={{ marginBottom: '20px', padding: '10px 15px', fontSize: '16px', cursor: 'pointer' }}
      >
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
              
              {(game.status === 'new' || game.status === 'in-progress' || game.status === 'paused') && game.localId && (
                <Link to={`/stat_keeper/game/${game.localId}`}>
                  <button style={{ marginTop: '10px', padding: '8px 12px', cursor: 'pointer' }}>Resume Game</button>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default StatKeeper;
