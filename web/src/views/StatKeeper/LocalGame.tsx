import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoredGame } from './db'; // Updated import path
import { leagues } from '../../api'; 

// Helper function to get league name from ID
const getLeagueName = (leagueId: string): string => {
  const league = leagues.find(l => l.id === leagueId);
  return league ? league.name : `Unknown League (${leagueId})`;
};

// A unique sentinel value to represent the loading state for useLiveQuery's defaultValue
const LOADING_SENTINEL = Symbol("loading");

function LocalGame() {
  const { localGameId } = useParams<{ localGameId: string }>(); 
  const numericLocalGameId = localGameId ? parseInt(localGameId, 10) : undefined;

  const game: StoredGame | undefined | typeof LOADING_SENTINEL = useLiveQuery(
    async () => {
      if (numericLocalGameId === undefined || isNaN(numericLocalGameId)) {
        return undefined;
      }
      return db.games.get(numericLocalGameId);
    },
    [numericLocalGameId], 
    LOADING_SENTINEL 
  );

  if (numericLocalGameId === undefined || isNaN(numericLocalGameId)) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Invalid game ID.</p>
        <Link to="/stat_keeper">Back to StatKeeper Home</Link>
      </div>
    );
  }

  if (game === LOADING_SENTINEL) {
    return <p style={{ padding: '20px' }}>Loading game data...</p>;
  }

  if (game === undefined) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Game with ID {localGameId} not found.</p>
        <Link to="/stat_keeper">Back to StatKeeper Home</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Link to="/stat_keeper" style={{ display: 'inline-block' }}>
          &larr; Back to StatKeeper Home
        </Link>
        <Link to={`/stat_keeper/edit_game/${game.localId}`}> 
          <button style={{ padding: '8px 12px', cursor: 'pointer' }}>Edit Game</button>
        </Link>
      </div>
      <h1>Game: {game.homeTeam} vs {game.awayTeam}</h1>
      <p><strong>League:</strong> {getLeagueName(game.league_id)}</p>
      <p><strong>Week:</strong> {game.week}</p>
      <p><strong>Status:</strong> {game.status}</p>
      <p><strong>Score:</strong> {game.homeTeam} {game.homeScore} - {game.awayScore} {game.awayTeam}</p>
      <p><strong>Last Modified:</strong> {new Date(game.lastModified).toLocaleString()}</p>

      <div style={{ marginTop: '20px' }}>
        <h3>Rosters</h3>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <div>
            <strong>{game.homeTeam}</strong>
            <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
              {game.homeRoster.map(player => <li key={player}>{player}</li>)}
            </ul>
          </div>
          <div>
            <strong>{game.awayTeam}</strong>
            <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
              {game.awayRoster.map(player => <li key={player}>{player}</li>)}
            </ul>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <h2>Stat Taking Interface</h2>
        <p><em>(Stat taking controls and game event display will go here.)</em></p>
      </div>
    </div>
  );
}

export default LocalGame;
