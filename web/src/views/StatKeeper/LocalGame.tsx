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

function LocalGame() {
  const { localGameId } = useParams<{ localGameId: string }>();
  const numericLocalGameId = localGameId ? parseInt(localGameId, 10) : undefined;

  // Fetch the specific game from Dexie using the localGameId
  const game = useLiveQuery(
    async () => {
      if (numericLocalGameId === undefined || isNaN(numericLocalGameId)) {
        return undefined;
      }
      return db.games.get(numericLocalGameId);
    },
    [numericLocalGameId] // Dependencies array: re-run query if localGameId changes
  );

  if (numericLocalGameId === undefined || isNaN(numericLocalGameId)) {
    return (
      <div>
        <p>Invalid game ID.</p>
        <Link to="/stat_keeper">Back to StatKeeper Home</Link>
      </div>
    );
  }

  if (game === undefined && numericLocalGameId !== undefined) {
    // useLiveQuery returns undefined on first render or if game not found
    // We check numericLocalGameId to distinguish initial load from "not found" after query
    const gameStillLoading = useLiveQuery(async () => {
        const g = await db.games.get(numericLocalGameId);
        return g === undefined; // Returns true if still loading (or truly not found)
    }, [numericLocalGameId], null); // Default to null to avoid undefined flicker

    if (gameStillLoading === null || gameStillLoading) {
        return <p>Loading game data...</p>;
    }
    return (
        <div>
            <p>Game with ID {localGameId} not found.</p>
            <Link to="/stat_keeper">Back to StatKeeper Home</Link>
        </div>
    );
  }
  
  if (!game) {
    // This case should ideally be caught by the above, but as a fallback
    return (
        <div>
            <p>Game with ID {localGameId} not found.</p>
            <Link to="/stat_keeper">Back to StatKeeper Home</Link>
        </div>
    );
  }


  return (
    <div style={{ padding: '20px' }}>
      <Link to="/stat_keeper" style={{ marginBottom: '20px', display: 'inline-block' }}>
        &larr; Back to StatKeeper Home
      </Link>
      <h1>Game: {game.homeTeam} vs {game.awayTeam}</h1>
      <p><strong>League:</strong> {getLeagueName(game.league_id)}</p>
      <p><strong>Week:</strong> {game.week}</p>
      <p><strong>Status:</strong> {game.status}</p>
      <p><strong>Score:</strong> {game.homeTeam} {game.homeScore} - {game.awayScore} {game.awayTeam}</p>
      <p><strong>Last Modified:</strong> {new Date(game.lastModified).toLocaleString()}</p>

      <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <h2>Stat Taking Interface</h2>
        <p><em>(Stat taking controls and game event display will go here.)</em></p>
        {/* 
          Placeholder for game actions:
          - Start/Pause/End Point
          - Record Pull, Pass, Point, D, Throwaway, Drop
          - Player selection for events
          - Score updates
          - Undo last event
          - Save game progress
          - Mark game as complete/submit
        */}
      </div>
    </div>
  );
}

export default LocalGame;
