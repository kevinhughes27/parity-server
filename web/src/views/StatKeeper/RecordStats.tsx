import React from 'react';
import { GameState } from './models';
import { Bookkeeper } from './bookkeeper';
import PointEventsDisplay from './PointEventsDisplay'; // Import the new component

interface RecordStatsProps {
  bookkeeper: Bookkeeper;
  onPerformAction: (
    action: (bk: Bookkeeper) => void,
    options?: { skipViewChange?: boolean; skipSave?: boolean }
  ) => Promise<void>;
  onPointScored: () => void;
  onChangeLine: () => void;
  // onSubmitGame and gameStatus props are removed
}

const RecordStats: React.FC<RecordStatsProps> = ({
  bookkeeper,
  onPerformAction,
  onPointScored,
  onChangeLine,
}) => {
  const currentGameState = bookkeeper.gameState();
  const homePlayersOnLine = bookkeeper.homePlayers || [];
  const awayPlayersOnLine = bookkeeper.awayPlayers || [];
  const playByPlay = bookkeeper.getCurrentPointPrettyPrint(); // Renamed method

  const handlePlayerClick = async (playerName: string, isHomeTeamPlayer: boolean) => {
    if (bookkeeper.shouldRecordNewPass()) {
      await onPerformAction(bk => bk.recordPass(playerName));
    } else {
      await onPerformAction(bk => bk.recordFirstActor(playerName, isHomeTeamPlayer));
    }
  };

  const handleActionClick = async (actionFunc: (bk: Bookkeeper) => void) => {
    await onPerformAction(actionFunc);
  };

  const handlePointClick = async () => {
    await onPerformAction(bk => bk.recordPoint(), { skipViewChange: true });
    onPointScored();
  };

  const renderPlayerButton = (playerName: string, isHomeTeamLine: boolean) => {
    let isDisabled = false;
    let isActivePlayer = false;
    let isGenerallyEnabledForTeam = false;

    if (bookkeeper.firstActor === playerName) {
      isActivePlayer = true;
    }

    if (currentGameState === GameState.Start) {
      isGenerallyEnabledForTeam = true;
    } else if (currentGameState === GameState.WhoPickedUpDisc) {
      isGenerallyEnabledForTeam = isHomeTeamLine === bookkeeper.homePossession;
    } else if (currentGameState === GameState.Pull) {
      isGenerallyEnabledForTeam = false;
    } else if (bookkeeper.firstActor !== null) {
      isGenerallyEnabledForTeam = isHomeTeamLine === bookkeeper.homePossession;
    } else {
      isGenerallyEnabledForTeam = isHomeTeamLine === bookkeeper.homePossession;
    }

    isDisabled = !isGenerallyEnabledForTeam;

    if (isGenerallyEnabledForTeam) {
      if (bookkeeper.firstActor === playerName && bookkeeper.shouldRecordNewPass()) {
        isDisabled = true;
      }
    }

    const buttonStyle: React.CSSProperties = {
      display: 'block',
      width: '100%',
      padding: '10px',
      marginBottom: '5px',
      textAlign: 'left',
      border: '1px solid #ccc',
      borderRadius: '4px',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      fontWeight: isActivePlayer ? 'bold' : 'normal',
      backgroundColor: isDisabled ? '#e0e0e0' : isActivePlayer ? '#a7d7f5' : '#f0f0f0',
      color: isDisabled ? '#999' : '#000',
    };

    return (
      <button
        key={playerName}
        onClick={() => handlePlayerClick(playerName, isHomeTeamLine)}
        disabled={isDisabled}
        style={buttonStyle}
      >
        {playerName}
      </button>
    );
  };

  const btnPullEnabled = currentGameState === GameState.Pull && bookkeeper.firstActor !== null;
  const btnPointEnabled =
    (currentGameState === GameState.Normal || currentGameState === GameState.SecondD) &&
    bookkeeper.firstActor !== null;
  const btnDropEnabled =
    (currentGameState === GameState.Normal ||
      currentGameState === GameState.FirstThrowQuebecVariant ||
      currentGameState === GameState.FirstD ||
      currentGameState === GameState.SecondD) &&
    bookkeeper.firstActor !== null;
  const btnThrowAwayEnabled =
    (currentGameState === GameState.Normal ||
      currentGameState === GameState.FirstThrowQuebecVariant ||
      currentGameState === GameState.FirstD ||
      currentGameState === GameState.SecondD) &&
    bookkeeper.firstActor !== null;

  const btnDEnabled =
    bookkeeper.firstActor !== null &&
    (currentGameState === GameState.FirstD || currentGameState === GameState.SecondD);
  const btnCatchDEnabled =
    bookkeeper.firstActor !== null &&
    (currentGameState === GameState.FirstD || currentGameState === GameState.SecondD);

  const btnUndoEnabled = bookkeeper.getMementosCount() > 0;
  // Removed canSubmitGame logic

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div
        style={{
          padding: '10px',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px',
          textAlign: 'center',
          marginBottom: '10px',
        }}
      >
        <strong>Possession:</strong>{' '}
        {bookkeeper.homePossession ? bookkeeper.homeTeam.name : bookkeeper.awayTeam.name}
        {bookkeeper.firstActor && ` (Disc with: ${bookkeeper.firstActor})`}
        <br />
        <strong>Game State:</strong> {GameState[currentGameState]}
      </div>

      <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden', minHeight: '300px' }}> {/* Added minHeight */}
        <div style={{ flex: 1, padding: '0 10px', overflowY: 'auto', height: '100%' }}>
          <h4>{bookkeeper.homeTeam.name} (Line)</h4>
          {homePlayersOnLine.map(player => renderPlayerButton(player, true))}
        </div>

        <PointEventsDisplay title="Play by Play (Current Point)" events={playByPlay} />

        <div style={{ flex: 1, padding: '0 10px', overflowY: 'auto', height: '100%' }}>
          <h4>{bookkeeper.awayTeam.name} (Line)</h4>
          {awayPlayersOnLine.map(player => renderPlayerButton(player, false))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          padding: '10px 0',
          borderTop: '1px solid #ccc',
          marginTop: '10px',
        }}
      >
        <button
          onClick={() => handleActionClick(bk => bk.recordPull())}
          disabled={!btnPullEnabled}
          style={{ margin: '5px', padding: '10px' }}
        >
          Pull
        </button>
        <button
          onClick={handlePointClick}
          disabled={!btnPointEnabled}
          style={{ margin: '5px', padding: '10px', backgroundColor: 'lightgreen' }}
        >
          Point!
        </button>
        <button
          onClick={() => handleActionClick(bk => bk.recordDrop())}
          disabled={!btnDropEnabled}
          style={{ margin: '5px', padding: '10px' }}
        >
          Drop
        </button>
        <button
          onClick={() => handleActionClick(bk => bk.recordThrowAway())}
          disabled={!btnThrowAwayEnabled}
          style={{ margin: '5px', padding: '10px' }}
        >
          Throwaway
        </button>
        <button
          onClick={() => {
            if (!bookkeeper.firstActor) {
              alert('Select the player who got the D first.');
              return;
            }
            handleActionClick(bk => bk.recordD());
          }}
          disabled={!btnDEnabled}
          style={{ margin: '5px', padding: '10px' }}
        >
          D (Block)
        </button>
        <button
          onClick={() => {
            if (!bookkeeper.firstActor) {
              alert('Select the player who got the Catch D first.');
              return;
            }
            handleActionClick(bk => bk.recordCatchD());
          }}
          disabled={!btnCatchDEnabled}
          style={{ margin: '5px', padding: '10px' }}
        >
          Catch D
        </button>
        <button
          onClick={() => handleActionClick(bk => bk.undo())}
          disabled={!btnUndoEnabled}
          style={{
            margin: '5px',
            padding: '10px',
            backgroundColor: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Undo
        </button>
        <button onClick={onChangeLine} style={{ margin: '5px', padding: '10px' }}>
          Change Line
        </button>
        {/* Submit Game button removed from here */}
      </div>
    </div>
  );
};

export default RecordStats;
