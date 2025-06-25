import React from 'react';
import { useParams } from 'react-router-dom';
import { useBookkeeper, useFullscreen } from './hooks';
import EditGame from './EditGame';
import ViewGame from './ViewGame';

function LoadingState() {
  return (
    <div style={{ padding: '20px', height: '100vh', boxSizing: 'border-box' }}>
      <p>Loading game data...</p>
    </div>
  );
}

function LocalGame() {
  useFullscreen();
  const { localGameId } = useParams<{ localGameId: string }>();
  const bookkeeper = useBookkeeper(localGameId!);

  if (!bookkeeper) {
    return <LoadingState />;
  }

  const gameStatus = bookkeeper.getGameStatus();

  // If game is completed/submitted, show ViewGame mode
  if (['submitted', 'uploaded', 'sync-error'].includes(gameStatus)) {
    return <ViewGame bookkeeper={bookkeeper} />;
  }

  // Otherwise show in-progress game UI
  return <EditGame bookkeeper={bookkeeper} localGameId={localGameId!} />;
}


export default LocalGame;
