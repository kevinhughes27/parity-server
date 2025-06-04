import React from 'react';
import { GameState } from './models'; 
import { Bookkeeper } from './bookkeeper'

interface RecordStatsProps {
  bookkeeper: Bookkeeper;
  onPerformAction: (action: (bk: Bookkeeper) => void, options?: { skipViewChange?: boolean, skipSave?: boolean }) => Promise<void>;
  onPointScored: () => void;
  onChangeLine: () => void;
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
  const playByPlay = bookkeeper.undoHistory(); 

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
    let isActivePlayer = false; // Player currently has the disc
    let isGenerallyEnabledForTeam = false; // Team currently has possession or can pick up

    // Determine if this player is the one with the disc
    if (bookkeeper.firstActor === playerName) {
        isActivePlayer = true;
    }

    // Determine general button enablement based on possession and game state
    if (currentGameState === GameState.Start || currentGameState === GameState.WhoPickedUpDisc) {
        isGenerallyEnabledForTeam = isHomeTeamLine === bookkeeper.homePossession;
    } else if (bookkeeper.firstActor !== null) { 
        isGenerallyEnabledForTeam = isHomeTeamLine === bookkeeper.homePossession;
    } else if (currentGameState === GameState.Pull) {
        isGenerallyEnabledForTeam = false; // No player actions during pull setup
    } else {
        // If no firstActor and not Start/WhoPickedUpDisc/Pull, typically means disc is loose after turnover
        // Enable players on the team that *would* get possession
        isGenerallyEnabledForTeam = isHomeTeamLine === bookkeeper.homePossession;
    }
    
    isDisabled = !isGenerallyEnabledForTeam;

    if (isGenerallyEnabledForTeam) {
        if (bookkeeper.firstActor === playerName && bookkeeper.shouldRecordNewPass()) {
            isDisabled = true; // Cannot pass to self
        }
    }
    if (currentGameState === GameState.Pull) isDisabled = true;


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
        backgroundColor: isDisabled ? '#e0e0e0' : (isActivePlayer ? '#a7d7f5' : '#f0f0f0'), // Light grey default, lighter blue if active player
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

  // Button enabled states
  const btnPullEnabled = currentGameState === GameState.Pull && bookkeeper.firstActor !== null;
  const btnPointEnabled = (currentGameState === GameState.Normal || currentGameState === GameState.SecondD) && bookkeeper.firstActor !== null;
  const btnDropEnabled = (currentGameState === GameState.Normal || currentGameState === GameState.FirstThrowQuebecVariant || currentGameState === GameState.FirstD || currentGameState === GameState.SecondD) && bookkeeper.firstActor !== null;
  const btnThrowAwayEnabled = (currentGameState === GameState.Normal || currentGameState === GameState.FirstThrowQuebecVariant || currentGameState === GameState.FirstD || currentGameState === GameState.SecondD) && bookkeeper.firstActor !== null;
  
  // D/CatchD logic: enabled if a defensive player (on the team that does *not* have possession, or if disc is loose) is selected as firstActor
  // AND the game state allows for a defensive play.
  const canMakeDefensivePlay = currentGameState === GameState.FirstD || 
                               currentGameState === GameState.SecondD || 
                               currentGameState === GameState.WhoPickedUpDisc; // Disc is loose or just turned over

  // A D or Catch D is made by a player on the team that just gained possession or if disc is loose.
  // firstActor must be set to the player making the D.
  const isDefensivePlayerSelected = bookkeeper.firstActor !== null && 
                                   ((bookkeeper.homePossession && awayPlayersOnLine.includes(bookkeeper.firstActor)) || 
                                    (!bookkeeper.homePossession && homePlayersOnLine.includes(bookkeeper.firstActor)));

  const btnDEnabled = bookkeeper.firstActor !== null && canMakeDefensivePlay && isDefensivePlayerSelected;
  const btnCatchDEnabled = bookkeeper.firstActor !== null && canMakeDefensivePlay && isDefensivePlayerSelected;
  
  const btnUndoEnabled = bookkeeper.getMementosCount() > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' /* Adjust as needed for header/footer */ }}>
      <div style={{ padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px', textAlign: 'center', marginBottom: '10px' }}>
        <strong>Possession:</strong> {bookkeeper.homePossession ? bookkeeper.homeTeam.name : bookkeeper.awayTeam.name}
        {bookkeeper.firstActor && ` (Disc with: ${bookkeeper.firstActor})`}
        <br/>
        <strong>Game State:</strong> {GameState[currentGameState]}
      </div>

      <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Home Team Players */}
        <div style={{ flex: 1, padding: '0 10px', overflowY: 'auto' }}>
          <h4>{bookkeeper.homeTeam.name} (Line)</h4>
          {homePlayersOnLine.map(player => renderPlayerButton(player, true))}
        </div>

        {/* Play by Play */}
        <div style={{ flex: 1.5, padding: '0 10px', borderLeft: '1px solid #ccc', borderRight: '1px solid #ccc', overflowY: 'auto' }}>
          <h4>Play by Play (Current Point)</h4>
          {playByPlay.length === 0 ? (
            <p>No events yet for this point.</p>
          ) : (
            <ul style={{ listStyleType: 'decimal', paddingLeft: '20px' }}>
              {playByPlay.map((eventStr, index) => (
                <li key={index}>{eventStr}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Away Team Players */}
        <div style={{ flex: 1, padding: '0 10px', overflowY: 'auto' }}>
          <h4>{bookkeeper.awayTeam.name} (Line)</h4>
          {awayPlayersOnLine.map(player => renderPlayerButton(player, false))}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', padding: '10px 0', borderTop: '1px solid #ccc', marginTop: '10px' }}>
        <button onClick={() => handleActionClick(bk => bk.recordPull())} disabled={!btnPullEnabled} style={{ margin: '5px', padding: '10px' }}>Pull</button>
        <button onClick={handlePointClick} disabled={!btnPointEnabled} style={{ margin: '5px', padding: '10px', backgroundColor: 'lightgreen' }}>Point!</button>
        <button onClick={() => handleActionClick(bk => bk.recordDrop())} disabled={!btnDropEnabled} style={{ margin: '5px', padding: '10px' }}>Drop</button>
        <button onClick={() => handleActionClick(bk => bk.recordThrowAway())} disabled={!btnThrowAwayEnabled} style={{ margin: '5px', padding: '10px' }}>Throwaway</button>
        <button 
            onClick={() => {
                if (!bookkeeper.firstActor) { alert("Select the player who got the D first."); return; }
                handleActionClick(bk => bk.recordD());
            }} 
            disabled={!btnDEnabled}
            style={{ margin: '5px', padding: '10px' }}
        >
            D (Block)
        </button>
        <button 
            onClick={() => {
                if (!bookkeeper.firstActor) { alert("Select the player who got the Catch D first."); return; }
                handleActionClick(bk => bk.recordCatchD());
            }} 
            disabled={!btnCatchDEnabled}
            style={{ margin: '5px', padding: '10px' }}
        >
            Catch D
        </button>
        <button onClick={() => handleActionClick(bk => bk.undo())} disabled={!btnUndoEnabled} style={{ margin: '5px', padding: '10px', backgroundColor: '#ff9800', color: 'white', border:'none', borderRadius:'4px' }}>Undo</button>
        <button onClick={onChangeLine} style={{ margin: '5px', padding: '10px' }}>Change Line</button>
      </div>
    </div>
  );
};

export default RecordStats;
