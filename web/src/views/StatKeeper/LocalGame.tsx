import React from 'react';
import { Link } from 'react-router-dom';
import { getLeagueName } from '../../api';
import { useLocalGame } from './hooks'; // Updated import path

function LocalGame() {
  const { game, isLoading, error, numericGameId } = useLocalGame();

  if (isLoading) {
    return <p style={{ padding: '20px' }}>Loading game data...</p>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <p>{error}</p>
        <Link to="/stat_keeper">&larr; Back to StatKeeper Home</Link>
      </div>
    );
  }

  if (!game) {
    // This state should generally be covered by the 'error' or 'isLoading' states.
    // If numericGameId was valid but game not found, 'error' will be set.
    // If numericGameId was invalid, 'error' will be set.
    // This is a fallback.
    return (
      <div style={{ padding: '20px' }}>
        <p>Game not found or ID is invalid.</p>
        <Link to="/stat_keeper">&larr; Back to StatKeeper Home</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <Link to="/stat_keeper" style={{ display: 'inline-block' }}>
          &larr; Back to StatKeeper Home
        </Link>
        {/* numericGameId from the hook should be defined if game is loaded */}
        <Link to={`/stat_keeper/edit_game/${numericGameId}`}>
          <button style={{ padding: '8px 12px', cursor: 'pointer' }}>Edit Game</button>
        </Link>
      </div>
      <h1>
        Game: {game.homeTeam} vs {game.awayTeam}
      </h1>
      <p>
        <strong>League:</strong> {getLeagueName(game.league_id)}
      </p>
      <p>
        <strong>Week:</strong> {game.week}
      </p>
      <p>
        <strong>Status:</strong> {game.status}
      </p>
      <p>
        <strong>Score:</strong> {game.homeTeam} {game.homeScore} - {game.awayScore} {game.awayTeam}
      </p>
      <p>
        <strong>Last Modified:</strong> {new Date(game.lastModified).toLocaleString()}
      </p>

      <div style={{ marginTop: '20px' }}>
        <h3>Rosters</h3>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <div>
            <strong>{game.homeTeam}</strong>
            <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
              {game.homeRoster.map(player => (
                <li key={player}>{player}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>{game.awayTeam}</strong>
            <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
              {game.awayRoster.map(player => (
                <li key={player}>{player}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <h2>Stat Taking Interface</h2>
        <p>
          <em>(Stat taking controls and game event display will go here.)</em>
        </p>
      </div>
    </div>
  );
}

export default LocalGame;
