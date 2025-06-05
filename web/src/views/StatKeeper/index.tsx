import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoredGame } from './db';
import { Link, useNavigate } from 'react-router-dom';
import { getLeagueName } from '../../api';

function StatKeeper() {
  const navigate = useNavigate();

  const games = useLiveQuery(() => db.games.orderBy('lastModified').reverse().toArray(), []);

  const handleStartNewGame = () => {
    navigate('/stat_keeper/new_game');
  };

  const handleDeleteGame = async (localId: number | undefined) => {
    if (localId === undefined) {
      console.error('Cannot delete game with undefined ID.');
      return;
    }
    const gameToDelete = games?.find(g => g.localId === localId);
    const gameName = gameToDelete
      ? `${gameToDelete.homeTeam} vs ${gameToDelete.awayTeam}`
      : `Game ID ${localId}`;

    if (
      window.confirm(
        `Are you sure you want to delete the game: ${gameName}? This action cannot be undone.`
      )
    ) {
      try {
        await db.games.delete(localId);
        console.log(`Game with localId: ${localId} deleted successfully.`);
      } catch (error) {
        console.error('Failed to delete game:', error);
        alert(`Failed to delete game: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  if (games === undefined) {
    return <p style={{ padding: '20px' }}>Loading local games...</p>;
  }

  const resumableStatuses: StoredGame['status'][] = ['new', 'in-progress', 'paused', 'sync-error'];
  const resumableGames = games.filter(game => resumableStatuses.includes(game.status));
  const otherGames = games.filter(game => !resumableStatuses.includes(game.status));

  const getStatusColor = (status: StoredGame['status']): string => {
    switch (status) {
      case 'new':
      case 'in-progress':
      case 'paused':
        return 'blue';
      case 'uploaded':
        return 'green';
      case 'sync-error':
        return 'red';
      case 'completed':
      case 'submitted':
        return 'black'; // Or a muted color like '#555'
      default:
        return 'black';
    }
  };

  const renderGameItem = (game: StoredGame) => (
    <li
      key={game.localId}
      style={{
        marginBottom: '15px',
        padding: '15px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        boxShadow: '2px 2px 5px rgba(0,0,0,0.1)',
      }}
    >
      <h3>
        {game.homeTeam} vs {game.awayTeam}
      </h3>
      <p style={{ margin: '5px 0' }}>
        <strong>League:</strong> {getLeagueName(game.league_id)} | <strong>Week:</strong>{' '}
        {game.week}
      </p>
      <p style={{ margin: '5px 0' }}>
        <strong>Status:</strong>{' '}
        <span
          style={{
            fontWeight: 'bold',
            color: getStatusColor(game.status),
          }}
        >
          {game.status}
        </span>
      </p>
      <p style={{ margin: '5px 0' }}>
        <strong>Score:</strong> {game.homeTeam} {game.homeScore} - {game.awayScore}{' '}
        {game.awayTeam}
      </p>
      <p style={{ margin: '5px 0' }}>
        <strong>Last Modified:</strong> {game.lastModified.toLocaleString()}
      </p>

      <div style={{ marginTop: '10px' }}>
        {(game.status === 'new' ||
          game.status === 'in-progress' ||
          game.status === 'paused' ||
          game.status === 'sync-error') &&
          game.localId && (
            <Link to={`/stat_keeper/game/${game.localId}`}>
              <button style={{ padding: '8px 12px', cursor: 'pointer', marginRight: '10px' }}>
                {game.status === 'sync-error' ? 'Retry/View Game' : 'Resume Game'}
              </button>
            </Link>
          )}
        {(game.status === 'submitted' ||
          game.status === 'uploaded' ||
          game.status === 'completed') &&
          game.localId && (
            <Link to={`/stat_keeper/game/${game.localId}`}>
              <button
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  marginRight: '10px',
                  backgroundColor: '#eee',
                }}
              >
                View Game
              </button>
            </Link>
          )}
        <button
          onClick={() => handleDeleteGame(game.localId)}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Delete
        </button>
      </div>
    </li>
  );

  return (
    <div style={{ padding: '20px' }}>
      <h1>StatKeeper</h1>
      <button
        onClick={handleStartNewGame}
        style={{ marginBottom: '20px', padding: '10px 15px', fontSize: '16px', cursor: 'pointer' }}
      >
        Start New Game
      </button>

      {resumableGames.length > 0 && (
        <>
          <h2>Resumable Games</h2>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {resumableGames.map(renderGameItem)}
          </ul>
        </>
      )}

      {otherGames.length > 0 && (
        <>
          <h2>Other Local Games</h2>
          <ul style={{ listStyleType: 'none', padding: 0 }}>{otherGames.map(renderGameItem)}</ul>
        </>
      )}

      {games.length === 0 && (
        <p>No games stored locally. Click "Start New Game" to begin.</p>
      )}
    </div>
  );
}

export default StatKeeper;
