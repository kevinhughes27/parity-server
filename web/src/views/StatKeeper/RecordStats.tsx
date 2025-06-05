import React from 'react';
import { GameState } from './models';
import { Bookkeeper } from './bookkeeper';
import PointEventsDisplay from './PointEventsDisplay';

interface RecordStatsProps {
  bookkeeper: Bookkeeper;
  fullHomeRoster: string[]; // New prop for the complete home team roster
  fullAwayRoster: string[]; // New prop for the complete away team roster
  onPerformAction: (
    action: (bk: Bookkeeper) => void,
    options?: { skipViewChange?: boolean; skipSave?: boolean }
  ) => Promise<void>;
  onPointScored: () => void;
  onChangeLine: () => void;
}

const RecordStats: React.FC<RecordStatsProps> = ({
  bookkeeper,
  fullHomeRoster,
  fullAwayRoster,
  onPerformAction,
  onPointScored,
  onChangeLine,
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
    // Default: if not on active line, button is completely disabled and styled differently.
    if (!isPlayerOnActiveLine) {
      const style: React.CSSProperties = {
        display: 'block',
        width: '100%',
        padding: '10px',
        marginBottom: '5px',
        textAlign: 'left',
        border: '1px solid #eee', // Lighter border for off-line players
        borderRadius: '4px',
        backgroundColor: '#f8f9fa', // Distinctly "off-line" background
        color: '#adb5bd', // Greyed out text
        cursor: 'not-allowed',
        fontWeight: 'normal',
      };
      return (
        <button key={playerName} disabled style={style}>
          {playerName}
        </button>
      );
    }

    // Player IS on the active line. Now apply game state logic for interactivity.
    let isDisabledByGameState = false;
    const isActivePlayer = bookkeeper.firstActor === playerName; // Player currently has the disc

    if (currentGameState === GameState.Start) {
      // Any player on an active line can be selected to start the point.
      isDisabledByGameState = false;
    } else if (currentGameState === GameState.WhoPickedUpDisc) {
      // Only players on the team that currently has possession (to pick up the disc).
      isDisabledByGameState = !(isHomeTeamButton === bookkeeper.homePossession);
    } else if (currentGameState === GameState.Pull) {
      // Puller is already selected (firstActor), no other player interaction until "Pull" button is pressed.
      isDisabledByGameState = true;
    } else if (bookkeeper.firstActor !== null) {
      // A player (firstActor) has the disc.
      if (isHomeTeamButton === bookkeeper.homePossession) {
        // Player is on the team with possession.
        if (isActivePlayer && bookkeeper.shouldRecordNewPass()) {
          // The player with the disc cannot pass to themselves.
          isDisabledByGameState = true;
        } else {
          // Other players on the team with possession can receive a pass.
          // Or, if it's the active player, other actions might be available (e.g. throwaway, point).
          isDisabledByGameState = false;
        }
      } else {
        // Player is on the team without possession, cannot act.
        isDisabledByGameState = true;
      }
    } else {
      // bookkeeper.firstActor is null, and not Start, WhoPickedUpDisc, or Pull.
      // This implies disc is loose (e.g. after a D, throwaway, drop).
      // Should effectively be GameState.WhoPickedUpDisc.
      isDisabledByGameState = !(isHomeTeamButton === bookkeeper.homePossession);
    }

    const finalIsDisabled = isDisabledByGameState;

    const buttonStyle: React.CSSProperties = {
      display: 'block',
      width: '100%',
      padding: '10px',
      marginBottom: '5px',
      textAlign: 'left',
      border: '1px solid #ccc',
      borderRadius: '4px',
      fontWeight: isActivePlayer ? 'bold' : 'normal',
      backgroundColor: finalIsDisabled
        ? '#e0e0e0' // On line, but disabled by game state
        : isActivePlayer
          ? '#a7d7f5' // Active player (has disc)
          : '#f0f0f0', // On line and enabled for interaction
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

      <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden', minHeight: '300px' }}>
        <div style={{ flex: 1, padding: '0 10px', overflowY: 'auto', height: '100%' }}>
          <h4>{bookkeeper.homeTeam.name} (Roster)</h4>
          {fullHomeRoster.map(player =>
            renderPlayerButton(player, true, homePlayersOnActiveLine.includes(player))
          )}
        </div>

        <PointEventsDisplay title="Play by Play (Current Point)" events={playByPlay} />

        <div style={{ flex: 1, padding: '0 10px', overflowY: 'auto', height: '100%' }}>
          <h4>{bookkeeper.awayTeam.name} (Roster)</h4>
          {fullAwayRoster.map(player =>
            renderPlayerButton(player, false, awayPlayersOnActiveLine.includes(player))
          )}
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
      </div>
    </div>
  );
};

export default RecordStats;
