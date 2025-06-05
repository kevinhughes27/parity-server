import React from 'react';
import { GameState } from './models';
import { Bookkeeper } from './bookkeeper';
import PointEventsDisplay from './PointEventsDisplay';

interface RecordStatsProps {
  bookkeeper: Bookkeeper;
  fullHomeRoster: string[]; // Assumed to be pre-sorted by parent (LocalGame)
  fullAwayRoster: string[]; // Assumed to be pre-sorted by parent (LocalGame)
  onPerformAction: (
    action: (bk: Bookkeeper) => void,
    options?: { skipViewChange?: boolean; skipSave?: boolean }
  ) => Promise<void>;
  onPointScored: () => void;
  onChangeLine: () => void;
  actionBarHeight: string; // Added prop
}

const RecordStats: React.FC<RecordStatsProps> = ({
  bookkeeper,
  fullHomeRoster, // Already sorted
  fullAwayRoster, // Already sorted
  onPerformAction,
  onPointScored,
  onChangeLine,
  actionBarHeight,
}) => {
  const currentGameState = bookkeeper.gameState();
  const homePlayersOnActiveLine = bookkeeper.homePlayers || [];
  const awayPlayersOnActiveLine = bookkeeper.awayPlayers || [];
  const playByPlay = bookkeeper.getCurrentPointPrettyPrint();

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

  const renderPlayerButton = (
    playerName: string,
    isHomeTeamButton: boolean,
    isPlayerOnActiveLine: boolean
  ) => {
    if (!isPlayerOnActiveLine) {
      const style: React.CSSProperties = {
        display: 'block',
        width: '100%',
        padding: '8px', // Reduced padding
        fontSize: '0.9em', // Slightly smaller font
        marginBottom: '5px',
        textAlign: 'left',
        border: '1px solid #eee',
        borderRadius: '4px',
        backgroundColor: '#f8f9fa',
        color: '#adb5bd',
        cursor: 'not-allowed',
        fontWeight: 'normal',
      };
      return (
        <button key={playerName} disabled style={style}>
          {playerName}
        </button>
      );
    }

    let isDisabledByGameState = false;
    const isActivePlayer = bookkeeper.firstActor === playerName;

    if (currentGameState === GameState.Start) {
      isDisabledByGameState = false;
    } else if (currentGameState === GameState.WhoPickedUpDisc) {
      isDisabledByGameState = !(isHomeTeamButton === bookkeeper.homePossession);
    } else if (currentGameState === GameState.Pull) {
      isDisabledByGameState = true;
    } else if (bookkeeper.firstActor !== null) {
      if (isHomeTeamButton === bookkeeper.homePossession) {
        if (isActivePlayer && bookkeeper.shouldRecordNewPass()) {
          isDisabledByGameState = true;
        } else {
          isDisabledByGameState = false;
        }
      } else {
        isDisabledByGameState = true;
      }
    } else {
      isDisabledByGameState = !(isHomeTeamButton === bookkeeper.homePossession);
    }

    const finalIsDisabled = isDisabledByGameState;

    const buttonStyle: React.CSSProperties = {
      display: 'block',
      width: '100%',
      padding: '8px', // Reduced padding
      fontSize: '0.9em', // Slightly smaller font
      marginBottom: '5px',
      textAlign: 'left',
      border: '1px solid #ccc',
      borderRadius: '4px',
      fontWeight: isActivePlayer ? 'bold' : 'normal',
      backgroundColor: finalIsDisabled ? '#e0e0e0' : isActivePlayer ? '#a7d7f5' : '#f0f0f0',
      color: finalIsDisabled ? '#999' : '#000',
      cursor: finalIsDisabled ? 'not-allowed' : 'pointer',
    };

    return (
      <button
        key={playerName}
        onClick={() => handlePlayerClick(playerName, isHomeTeamButton)}
        disabled={finalIsDisabled}
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

  const actionButtonStyle: React.CSSProperties = {
    margin: '2px 4px', // Reduced margin for tighter packing
    padding: '8px 10px', // Reduced padding
    fontSize: '0.85em', // Slightly smaller font for action buttons
    minWidth: '60px', // Ensure buttons have some minimum width
    flexShrink: 0, // Prevent buttons from shrinking too much if space is tight
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {' '}
      {/* Fill parent height */}
      {/* Scrollable Content Area */}
      <div style={{ flexGrow: 1, overflowY: 'auto', padding: '10px' }}>
        {' '}
        {/* Added padding to overall component */}
        <div
          style={{
            padding: '8px', // Reduced padding
            backgroundColor: '#f9f9f9',
            borderRadius: '4px',
            textAlign: 'center',
            marginBottom: '10px',
            fontSize: '0.9em', // Smaller font for status
          }}
        >
          <strong>Possession:</strong>{' '}
          {bookkeeper.homePossession ? bookkeeper.homeTeam.name : bookkeeper.awayTeam.name}
          {bookkeeper.firstActor && ` (Disc with: ${bookkeeper.firstActor})`}
          <br />
          <strong>Game State:</strong> {GameState[currentGameState]}
        </div>
        <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden', minHeight: '200px' }}>
          {' '}
          {/* Adjusted minHeight */}
          <div style={{ flex: 1, padding: '0 5px', overflowY: 'auto', height: '100%' }}>
            {' '}
            {/* Reduced horizontal padding */}
            <h4>{bookkeeper.homeTeam.name} (Roster)</h4>
            {/* fullHomeRoster is already sorted by LocalGame */}
            {fullHomeRoster.map(player =>
              renderPlayerButton(player, true, homePlayersOnActiveLine.includes(player))
            )}
          </div>
          <PointEventsDisplay title="Play by Play (Current Point)" events={playByPlay} />
          <div style={{ flex: 1, padding: '0 5px', overflowY: 'auto', height: '100%' }}>
            {' '}
            {/* Reduced horizontal padding */}
            <h4>{bookkeeper.awayTeam.name} (Roster)</h4>
            {/* fullAwayRoster is already sorted by LocalGame */}
            {fullAwayRoster.map(player =>
              renderPlayerButton(player, false, awayPlayersOnActiveLine.includes(player))
            )}
          </div>
        </div>
      </div>
      {/* Fixed Action Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: actionBarHeight,
          padding: '5px 10px', // Reduced padding for the bar itself
          backgroundColor: 'white',
          borderTop: '1px solid #ccc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap', // Prevent main groups from wrapping, internal groups can wrap
          boxSizing: 'border-box',
          zIndex: 100,
        }}
      >
        {/* Left group of action buttons */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'flex-start',
            alignItems: 'center',
          }}
        >
          <button
            onClick={() => handleActionClick(bk => bk.recordPull())}
            disabled={!btnPullEnabled}
            style={actionButtonStyle}
          >
            Pull
          </button>
          <button
            onClick={handlePointClick}
            disabled={!btnPointEnabled}
            style={{ ...actionButtonStyle, backgroundColor: 'lightgreen' }}
          >
            Point!
          </button>
          <button
            onClick={() => handleActionClick(bk => bk.recordDrop())}
            disabled={!btnDropEnabled}
            style={actionButtonStyle}
          >
            Drop
          </button>
          <button
            onClick={() => handleActionClick(bk => bk.recordThrowAway())}
            disabled={!btnThrowAwayEnabled}
            style={actionButtonStyle}
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
            style={actionButtonStyle}
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
            style={actionButtonStyle}
          >
            Catch D
          </button>
        </div>

        {/* Right group of action buttons */}
        <div
          style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', marginLeft: 'auto' }}
        >
          <button onClick={onChangeLine} style={{ ...actionButtonStyle, marginRight: '5px' }}>
            Change Line
          </button>
          <button
            onClick={() => handleActionClick(bk => bk.undo())}
            disabled={!btnUndoEnabled}
            style={{
              ...actionButtonStyle,
              backgroundColor: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            Undo
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordStats;
