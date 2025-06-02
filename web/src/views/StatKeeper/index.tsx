import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoredGame } from './db'; // Updated import path
import { Link, useNavigate } from 'react-router-dom'; 
import { leagues } from '../../api'; 

// Helper function to get league name from ID
const getLeagueName = (leagueId: string): string => {
  const league = leagues.find(l => l.id === leagueId);
  return league ? league.name : `Unknown League (${leagueId})`;
};

function StatKeeper() {
  const navigate = useNavigate(); 

  const games = useLiveQuery(
    () => db.games.orderBy('lastModified').reverse().toArray(),
    []
  );

  const handleStartNewGame = () => {
    navigate('/stat_keeper/new_game');
  };

  const handleDeleteGame = async (localId: number | undefined) => {
    if (localId === undefined) {
      console.error("Cannot delete game with undefined ID.");
      return;
    }
    const gameToDelete = games?.find(g => g.localId === localId);
    const gameName = gameToDelete ? `${gameToDelete.homeTeam} vs ${gameToDelete.awayTeam}` : `Game ID ${localId}`;
    
    if (window.confirm(`Are you sure you want to delete the game: ${gameName}? This action cannot be undone.`)) {
      try {
        await db.games.delete(localId);
        console.log(`Game with localId: ${localId} deleted successfully.`);
      } catch (error) {
        console.error("Failed to delete game:", error);
        alert(`Failed to delete game: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
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
              
              <div style={{ marginTop: '10px' }}>
                {(game.status === 'new' || game.status === 'in-progress' || game.status === 'paused') && game.localId && (
                  <Link to={`/stat_keeper/game/${game.localId}`}>
                    <button style={{ padding: '8px 12px', cursor: 'pointer', marginRight: '10px' }}>Resume Game</button>
                  </Link>
                )}
                <button 
                  onClick={() => handleDeleteGame(game.localId)} 
                  style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default StatKeeper;
