import React from 'react';
import { GameState } from './models'; // EventType not needed directly for button logic
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
  const homePlayers = bookkeeper.homePlayers || []; // Current players on the line
  const awayPlayers = bookkeeper.awayPlayers || []; // Current players on the line
  const playByPlay = bookkeeper.undoHistory(); // Events for the current activePoint

  const handlePlayerClick = async (playerName: string, isHomeTeamPlayer: boolean) => {
    if (bookkeeper.shouldRecordNewPass()) {
      await onPerformAction(bk => bk.recordPass(playerName));
    } else {
      // Determine if the player is on the team that currently has possession
      // This logic is simplified; Bookkeeper's recordFirstActor handles possession setting.
      await onPerformAction(bk => bk.recordFirstActor(playerName, isHomeTeamPlayer));
    }
  };

  const handleActionClick = async (actionFunc: (bk: Bookkeeper) => void) => {
    await onPerformAction(actionFunc);
  };

  const handlePointClick = async () => {
    // skipViewChange is true because LocalGame will handle view change via onPointScored callback
    await onPerformAction(bk => bk.recordPoint(), { skipViewChange: true });
    onPointScored(); // Notify LocalGame to change view
  };

  const renderPlayerButtons = (playersOnLine: string[], isHomeTeamLine: boolean) => {
    // Determine if this team's player buttons should be generally enabled
    let teamButtonsGenerallyEnabled = false;
    if (currentGameState === GameState.Start || currentGameState === GameState.WhoPickedUpDisc) {
        // If firstActor is null, any player on the team that *should* have possession can act.
        // Bookkeeper.homePossession reflects who *will* have possession after firstActor is set.
        // For Start/WhoPickedUpDisc, if firstActor is null, players on the team that *will* possess are active.
        teamButtonsGenerallyEnabled = isHomeTeamLine === bookkeeper.homePossession;
    } else if (bookkeeper.firstActor !== null) { // Disc is live with a player
        teamButtonsGenerallyEnabled = isHomeTeamLine === bookkeeper.homePossession;
    } else if (currentGameState === GameState.Pull) { // No player actions during pull setup
        teamButtonsGenerallyEnabled = false;
    }


    return playersOnLine.map(player => {
      let isDisabled = !teamButtonsGenerallyEnabled; // Base disable state

      if (teamButtonsGenerallyEnabled) {
        if (bookkeeper.firstActor === player && bookkeeper.shouldRecordNewPass()) {
          // Player who has the disc cannot pass to themselves
          isDisabled = true;
        }
        if (bookkeeper.firstActor === null &&
            (currentGameState !== GameState.Start && currentGameState !== GameState.WhoPickedUpDisc)) {
          // If no one has the disc, and it's not a state where anyone can pick up (e.g. normal play after incomplete pass)
          // then player buttons should be disabled until an action like D, Throwaway, etc. resolves possession.
          // This case is tricky; usually an action button would be pressed first.
          // For simplicity, if firstActor is null in Normal play, players are disabled.
           if (currentGameState === GameState.Normal ||
               currentGameState === GameState.FirstThrowQuebecVariant ||
               currentGameState === GameState.FirstD ||
               currentGameState === GameState.SecondD) {
               // isDisabled = true; // This might be too restrictive. Let Bookkeeper logic handle invalid actions.
           }
        }
      }

      // Specific state overrides
      if (currentGameState === GameState.Pull) isDisabled = true; // All player buttons disabled when setting up for a pull

      return (
        <button
          key={player}
          onClick={() => handlePlayerClick(player, isHomeTeamLine)}
          disabled={isDisabled}
          style={{ margin: '5px', padding: '8px 12px', backgroundColor: isDisabled ? '#e0e0e0' : (isHomeTeamLine ? '#bbdefb' : '#ffcdd2') }}
        >
          {player}
        </button>
      );
    });
  };

  // Button enabled states based on Java's updateUI logic & Bookkeeper state
  const btnPullEnabled = currentGameState === GameState.Pull && bookkeeper.firstActor !== null;
  const btnPointEnabled = (currentGameState === GameState.Normal || currentGameState === GameState.SecondD) && bookkeeper.firstActor !== null;
  const btnDropEnabled = (currentGameState === GameState.Normal || currentGameState === GameState.FirstThrowQuebecVariant || currentGameState === GameState.FirstD || currentGameState === GameState.SecondD) && bookkeeper.firstActor !== null;

  // D and CatchD are actions by the player who just made the "throwaway" or "drop" effectively.
  // In the Java code, D/CatchD are enabled in FirstD state, implying the *other* team's player (who caused turnover) is 'firstActor'.
  // The current TS Bookkeeper sets firstActor to null after throwaway/drop.
  // Let's adjust: D/CatchD are actions of the *defensive* player.
  // So, they should be enabled when the disc is turned over (e.g., after ThrowAway/Drop, firstActor is null, possession changed).
  // The player who gets the D will be selected *after* pressing D.
  // This means D/CatchD are more like "meta" actions that then require a player selection.
  // For now, let's follow the pattern: if an action requires a firstActor, it's enabled if firstActor is set.
  // The Java logic for D/CatchD seems to imply firstActor is the one who *committed* the turnover.
  // Let's assume for D/CatchD, firstActor is the DEFENSIVE player making the play.
  // This means after a throwaway, firstActor is null. User clicks D, then clicks player.
  // So, D/CatchD should be enabled when firstActor is NULL and it's a turnover situation.
  const btnDEnabled = (currentGameState === GameState.FirstD || currentGameState === GameState.WhoPickedUpDisc) && bookkeeper.firstActor === null && !bookkeeper.homePossession === (bookkeeper.activePoint?.offensePlayers === bookkeeper.homePlayers);
  const btnCatchDEnabled = (currentGameState === GameState.FirstD || currentGameState === GameState.WhoPickedUpDisc) && bookkeeper.firstActor === null && !bookkeeper.homePossession === (bookkeeper.activePoint?.offensePlayers === bookkeeper.homePlayers);
  // Simplified: D/CatchD enabled if it's a turnover state and no one has picked up yet.
  // The original Java logic: btnD.setEnabled(state == GameState.FirstD); btnCatchD.setEnabled(state == GameState.FirstD);
  // This implies firstActor (thrower) is still set. Our TS bookkeeper clears firstActor on turnover.
  // Let's adapt: D/CatchD are for the player *making* the block.
  // So, they are enabled when the *other* team just had the disc.
  // And firstActor should be the player making the D.
  // This means D/CatchD are like Pass - first select player, then action.
  // The current model is: Action -> Player or Player -> Action.
  // Let's stick to Java: D/CatchD are enabled when firstActor (thrower) is set and state is FirstD.
  // This means bookkeeper.recordD() uses the current firstActor as the one who *got* D'd. This is unusual.
  // The Java code: bookkeeper.recordD() uses bookkeeper.firstActor (who is the thrower). This is wrong.
  // A "D" is by a defensive player.
  // Let's assume D/CatchD are pressed, then a player is selected.
  // So, these buttons are enabled if the state allows a D.
  const canMakeDefensivePlay = currentGameState === GameState.FirstD || // After a throwaway by other team
                               currentGameState === GameState.SecondD || // After a drop by other team
                               currentGameState === GameState.WhoPickedUpDisc; // Disc is loose

  const btnThrowAwayEnabled = (currentGameState === GameState.Normal || currentGameState === GameState.FirstThrowQuebecVariant || currentGameState === GameState.FirstD || currentGameState === GameState.SecondD) && bookkeeper.firstActor !== null;
  const btnUndoEnabled = bookkeeper.getMementosCount() > 0;


  return (
    <div>
      <h3>Record Events</h3>
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
        <strong>Current Possession:</strong> {bookkeeper.homePossession ? bookkeeper.homeTeam.name : bookkeeper.awayTeam.name}
        {bookkeeper.firstActor && ` (Disc with: ${bookkeeper.firstActor})`}
        <br/>
        <strong>Game State:</strong> {GameState[currentGameState]}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{minWidth: '280px', margin: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '4px'}}>
          <h4>{bookkeeper.homeTeam.name} (Line)</h4>
          {renderPlayerButtons(homePlayers, true)}
        </div>
        <div style={{minWidth: '280px', margin: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '4px'}}>
          <h4>{bookkeeper.awayTeam.name} (Line)</h4>
          {renderPlayerButtons(awayPlayers, false)}
        </div>
      </div>

      <div style={{ marginBottom: '20px', borderTop: '1px solid #ccc', paddingTop: '15px' }}>
        <h4>Actions</h4>
        <button onClick={() => handleActionClick(bk => bk.recordPull())} disabled={!btnPullEnabled} style={{ margin: '5px', padding: '10px' }}>Pull</button>
        <button onClick={handlePointClick} disabled={!btnPointEnabled} style={{ margin: '5px', padding: '10px', backgroundColor: 'lightgreen' }}>Point!</button>
        <button onClick={() => handleActionClick(bk => bk.recordDrop())} disabled={!btnDropEnabled} style={{ margin: '5px', padding: '10px' }}>Drop</button>
        <button onClick={() => handleActionClick(bk => bk.recordThrowAway())} disabled={!btnThrowAwayEnabled} style={{ margin: '5px', padding: '10px' }}>Throwaway</button>
        <p style={{fontSize: '0.9em', margin: '5px'}}>For D / Catch D: Select the defensive player first, then click D / Catch D.</p>
        <button
            onClick={() => {
                if (!bookkeeper.firstActor) { alert("Select the player who got the D."); return; }
                handleActionClick(bk => bk.recordD());
            }}
            disabled={!(bookkeeper.firstActor && canMakeDefensivePlay && (bookkeeper.homePossession ? awayPlayers.includes(bookkeeper.firstActor) : homePlayers.includes(bookkeeper.firstActor)))}
            style={{ margin: '5px', padding: '10px' }}
        >
            D (Block)
        </button>
        <button
            onClick={() => {
                if (!bookkeeper.firstActor) { alert("Select the player who got the Catch D."); return; }
                handleActionClick(bk => bk.recordCatchD());
            }}
            disabled={!(bookkeeper.firstActor && canMakeDefensivePlay && (bookkeeper.homePossession ? awayPlayers.includes(bookkeeper.firstActor) : homePlayers.includes(bookkeeper.firstActor)))}
            style={{ margin: '5px', padding: '10px' }}
        >
            Catch D
        </button>

      </div>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => handleActionClick(bk => bk.undo())} disabled={!btnUndoEnabled} style={{ margin: '5px', padding: '10px', backgroundColor: '#ff9800', color: 'white', border:'none', borderRadius:'4px' }}>Undo Last Event</button>
        <button onClick={onChangeLine} style={{ margin: '5px', padding: '10px' }}>Change Line / Mode</button>
      </div>

      <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
        <h4>Play by Play (Current Point)</h4>
        {playByPlay.length === 0 ? (
          <p>No events yet for this point.</p>
        ) : (
          <ul style={{ listStyleType: 'decimal', paddingLeft: '20px', maxHeight: '200px', overflowY: 'auto' }}>
            {playByPlay.map((eventStr, index) => (
              <li key={index}>{eventStr}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RecordStats;
