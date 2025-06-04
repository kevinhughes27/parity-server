import React, { useState, useEffect } from 'react';
import { Bookkeeper } from './models';

interface SelectLinesProps {
  bookkeeper: Bookkeeper;
  homeRoster: string[]; // Full team roster
  awayRoster: string[]; // Full team roster
  onPerformAction: (action: (bk: Bookkeeper) => void, options?: { skipViewChange?: boolean, skipSave?: boolean }) => Promise<void>;
  onLinesSelected: () => void;
}

const SelectLines: React.FC<SelectLinesProps> = ({
  bookkeeper,
  homeRoster,
  awayRoster,
  onPerformAction,
  onLinesSelected,
}) => {
  const [selectedHomePlayers, setSelectedHomePlayers] = useState<string[]>([]);
  const [selectedAwayPlayers, setSelectedAwayPlayers] = useState<string[]>([]);
  
  // Determine if this is the first point of the game or after half
  // to implement the "flip players" logic from Android.
  // `bookkeeper.activePoint` is null after a point, or at game start.
  // `bookkeeper.homePlayers` is null after a point, or at game start.
  // `bookkeeper.pointsAtHalf` indicates if half has been recorded.
  // `bookkeeper.activeGame.getPointCount()` gives total points played.
  const isFirstPointOfGameOrHalf = bookkeeper.activePoint === null &&
                                  (bookkeeper.activeGame.getPointCount() === 0 || 
                                   bookkeeper.activeGame.getPointCount() === bookkeeper['pointsAtHalf']); // Access private for logic

  useEffect(() => {
    // Pre-selection logic (flipping players)
    // This runs when the component mounts or when bookkeeper instance might change relevant state.
    if (bookkeeper.activePoint === null) { // Indicates start of a new point selection phase
        const lastHomePlayers = bookkeeper.homeParticipants; // Players who have participated
        const lastAwayPlayers = bookkeeper.awayParticipants;

        // If it's not the very first point of the game (i.e., some players have participated)
        // and we are in a state to flip (e.g. after a point, not after an undo that lands here)
        // The original Java code flips players based on who was *not* in the last line.
        // Bookkeeper's home/awayParticipants track everyone who has played in the game.
        // For a true flip, we'd need the immediate previous line.
        // A simpler approach for now: if players were just cleared (after a point),
        // we could try to select those who were *not* in `bookkeeper.homeParticipants` / `awayParticipants`
        // if that set represented the *last line only*. But it represents *all* participants.

        // Let's use the logic from Android's SelectPlayers#selectPlayers(Boolean flipPlayers)
        // which uses the full roster and removes players who were just on.
        // This requires knowing who was *just* on. Bookkeeper clears `homePlayers`/`awayPlayers` after a point.
        // We'd need to pass the previous line's players or enhance Bookkeeper.

        // For now, let's implement a simpler pre-selection:
        // If it's after a point (indicated by bookkeeper.homePlayers being null, but game has points)
        // and not the very start of the game.
        if (bookkeeper.activeGame.getPointCount() > 0 && bookkeeper.homePlayers === null) {
            // This implies a point was just scored.
            // The Android app pre-selects players NOT in the previous line.
            // We don't have the immediate previous line easily here after Bookkeeper clears it.
            // So, for now, we will not auto-flip and require manual selection.
            // setSelectedHomePlayers([]);
            // setSelectedAwayPlayers([]);
        } else {
            // Game start or other scenarios, no pre-selection or default to empty.
            // setSelectedHomePlayers([]);
            // setSelectedAwayPlayers([]);
        }
    }
  }, [bookkeeper]); // Re-run if bookkeeper instance changes significantly


  const leagueLineSize = bookkeeper.league.lineSize;

  const togglePlayerSelection = (
    playerName: string,
    isHomeTeam: boolean
  ) => {
    const currentSelection = isHomeTeam ? selectedHomePlayers : selectedAwayPlayers;
    const setter = isHomeTeam ? setSelectedHomePlayers : setSelectedAwayPlayers;
    
    if (currentSelection.includes(playerName)) {
      setter(currentSelection.filter(p => p !== playerName));
    } else {
      if (currentSelection.length < leagueLineSize) {
        setter([...currentSelection, playerName]);
      } else {
        alert(`Cannot select more than ${leagueLineSize} players for ${isHomeTeam ? bookkeeper.homeTeam.name : bookkeeper.awayTeam.name}.`);
      }
    }
  };

  const handleDone = async () => {
    const leftPlayerCount = selectedHomePlayers.length;
    const rightPlayerCount = selectedAwayPlayers.length;

    const leftCorrectNumPlayers = leftPlayerCount === leagueLineSize;
    const rightCorrectNumPlayers = rightPlayerCount === leagueLineSize;

    if (leftCorrectNumPlayers && rightCorrectNumPlayers) {
      await onPerformAction(bk => bk.recordActivePlayers(selectedHomePlayers, selectedAwayPlayers), { skipViewChange: true, skipSave: false });
      onLinesSelected();
    } else {
      let message = "Incorrect number of players:";
      if (!leftCorrectNumPlayers) {
        message += `\n${bookkeeper.homeTeam.name}: ${leftPlayerCount}/${leagueLineSize} selected`;
      }
      if (!rightCorrectNumPlayers) {
        message += `\n${bookkeeper.awayTeam.name}: ${rightPlayerCount}/${leagueLineSize} selected`;
      }
      message += "\n\nContinue with these players anyway?";

      if (window.confirm(message)) {
        await onPerformAction(bk => bk.recordActivePlayers(selectedHomePlayers, selectedAwayPlayers), { skipViewChange: true, skipSave: false });
        onLinesSelected();
      }
    }
  };
  
  const handleUndoLastAction = async () => {
    // This undo should take us back into the previous point's event recording
    // or undo the line selection if that was the last action.
    // LocalGame's handlePerformBookkeeperAction will manage view changes.
    await onPerformAction(bk => bk.undo());
  };


  const renderPlayerList = (players: string[], isHomeTeam: boolean) => {
    const selectedList = isHomeTeam ? selectedHomePlayers : selectedAwayPlayers;
    return (
      <ul style={{ listStyleType: 'none', padding: 0, maxHeight: '300px', overflowY: 'auto' }}>
        {players.map(player => (
          <li key={player} style={{ marginBottom: '5px' }}>
            <label style={{ display: 'block', padding: '5px', cursor: 'pointer', backgroundColor: selectedList.includes(player) ? '#e0f7fa' : 'transparent' }}>
              <input
                type="checkbox"
                checked={selectedList.includes(player)}
                onChange={() => togglePlayerSelection(player, isHomeTeam)}
                style={{ marginRight: '8px' }}
              />
              {player}
            </label>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <h3>Select Lines for Next Point</h3>
      <p>Required players per team: {leagueLineSize}</p>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{minWidth: '250px', margin: '10px'}}>
          <h4>{bookkeeper.homeTeam.name} ({selectedHomePlayers.length}/{leagueLineSize})</h4>
          {renderPlayerList(homeRoster, true)}
        </div>
        <div style={{minWidth: '250px', margin: '10px'}}>
          <h4>{bookkeeper.awayTeam.name} ({selectedAwayPlayers.length}/{leagueLineSize})</h4>
          {renderPlayerList(awayRoster, false)}
        </div>
      </div>
      <button 
        onClick={handleDone} 
        disabled={selectedHomePlayers.length === 0 || selectedAwayPlayers.length === 0}
        style={{ padding: '10px 15px', fontSize: '16px', marginRight: '10px', backgroundColor: 'green', color: 'white', border: 'none', borderRadius: '4px' }}
      >
        Confirm Lines & Start Point
      </button>
      {bookkeeper.getMementosCount() > 0 && ( // Only show if there's something to undo
         <button 
            onClick={handleUndoLastAction}
            style={{ padding: '10px 15px', fontSize: '16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}
          >
           Undo Last Action
         </button>
      )}
      <p style={{marginTop: '15px', fontSize: '0.9em', color: 'gray'}}>
        {isFirstPointOfGameOrHalf ? "Select players for the first point." : "Select players for the next point."}
        <br/>
        If a point was just scored, 'Undo Last Action' will revert the score and take you back to editing the last event of that point.
      </p>
    </div>
  );
};

export default SelectLines;
