import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoredGame } from '../../db'; // Adjusted path to ../../db.ts
import { leagues } from '../../api'; // To display league name

// Helper function to get league name from ID
const getLeagueName = (leagueId: string): string => {
  const league = leagues.find(l => l.id === leagueId);
  return league ? league.name : `Unknown League (${leagueId})`;
};

// A unique sentinel value to represent the loading state for useLiveQuery's defaultValue
const LOADING_SENTINEL = Symbol("loading");

function LocalGame() {
  const { localGameId } = useParams<{ localGameId: string }>(); // Hook 1: Called unconditionally
  const numericLocalGameId = localGameId ? parseInt(localGameId, 10) : undefined;

  // Hook 2: Fetch the specific game from Dexie using the localGameId. Called unconditionally.
  const game: StoredGame | undefined | typeof LOADING_SENTINEL = useLiveQuery(
    async () => {
      if (numericLocalGameId === undefined || isNaN(numericLocalGameId)) {
        // If the ID is invalid for the query, resolve to undefined.
        return undefined;
      }
      // db.games.get() will return the game object or undefined if not found.
      return db.games.get(numericLocalGameId);
    },
    [numericLocalGameId], // Dependencies array: re-run query if localGameId changes
    LOADING_SENTINEL // Default value: returned until the async querier resolves for the first time
  );

  // Handle invalid ID parsed from URL
  if (numericLocalGameId === undefined || isNaN(numericLocalGameId)) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Invalid game ID.</p>
        <Link to="/stat_keeper">Back to StatKeeper Home</Link>
      </div>
    );
  }

  // Handle loading state (game is the sentinel value)
  if (game === LOADING_SENTINEL) {
    return <p style={{ padding: '20px' }}>Loading game data...</p>;
  }

  // Handle game not found (query resolved, but game is undefined)
  if (game === undefined) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Game with ID {localGameId} not found.</p>
        <Link to="/stat_keeper">Back to StatKeeper Home</Link>
      </div>
    );
  }

  // If we reach here, game is a StoredGame object and is loaded successfully
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Link to="/stat_keeper" style={{ display: 'inline-block' }}>
          &larr; Back to StatKeeper Home
        </Link>
        <Link to={`/stat_keeper/edit_game_setup/${game.localId}`}>
          <button style={{ padding: '8px 12px', cursor: 'pointer' }}>Edit Game Setup</button>
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
