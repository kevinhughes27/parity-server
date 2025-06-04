import React, { useState, useEffect } from 'react';
import { Bookkeeper } from './bookkeeper'

interface SelectLinesProps {
  bookkeeper: Bookkeeper;
  homeRoster: string[]; // Full team roster
  awayRoster: string[]; // Full team roster
  onPerformAction: (action: (bk: Bookkeeper) => void, options?: { skipViewChange?: boolean, skipSave?: boolean }) => Promise<void>;
  onLinesSelected: () => void;
  isResumingPointMode: boolean;
  lastPlayedLine: { home: string[]; away: string[] } | null;
}

const SelectLines: React.FC<SelectLinesProps> = ({
  bookkeeper,
  homeRoster,
  awayRoster,
  onPerformAction,
  onLinesSelected,
  isResumingPointMode,
  lastPlayedLine,
}) => {
  const [selectedHomePlayers, setSelectedHomePlayers] = useState<string[]>([]);
  const [selectedAwayPlayers, setSelectedAwayPlayers] = useState<string[]>([]);

  const leagueLineSize = bookkeeper.league.lineSize;

  useEffect(() => {
    if (isResumingPointMode) {
      // Pre-select players who are currently on the line in Bookkeeper
      setSelectedHomePlayers(bookkeeper.homePlayers || []);
      setSelectedAwayPlayers(bookkeeper.awayPlayers || []);
    } else if (lastPlayedLine) {
      // Pre-select players who were NOT on the line that just finished
      setSelectedHomePlayers(homeRoster.filter(p => !lastPlayedLine.home.includes(p)));
      setSelectedAwayPlayers(awayRoster.filter(p => !lastPlayedLine.away.includes(p)));
    } else {
      // Default: Start of game or after an undo that clears lines, no pre-selection
      setSelectedHomePlayers([]);
      setSelectedAwayPlayers([]);
    }
  }, [isResumingPointMode, lastPlayedLine, bookkeeper.homePlayers, bookkeeper.awayPlayers, homeRoster, awayRoster]);


  const togglePlayerSelection = (
    playerName: string,
    isHomeTeam: boolean
  ) => {
    const currentSelection = isHomeTeam ? selectedHomePlayers : selectedAwayPlayers;
    const setter = isHomeTeam ? setSelectedHomePlayers : setSelectedAwayPlayers;
    const teamName = isHomeTeam ? bookkeeper.homeTeam.name : bookkeeper.awayTeam.name;

    if (currentSelection.includes(playerName)) {
      setter(currentSelection.filter(p => p !== playerName));
    } else {
      // Allow selecting more than lineSize if isResumingPointMode is false (i.e. selecting for a new point)
      // but still cap at lineSize if isResumingPointMode is true (just confirming/adjusting current line)
      // However, the original Android app allows overriding line size with confirmation.
      // For simplicity, let's always check against lineSize for adding.
      if (currentSelection.length < leagueLineSize) {
        setter([...currentSelection, playerName]);
      } else {
        // If already at line size, only allow if we are not in "resuming point" mode,
        // as the user might be intentionally selecting more for a new point (with override).
        // But the confirm dialog handles the override. So, this alert is for strict enforcement.
        // Let's keep the alert for now.
        alert(`Cannot select more than ${leagueLineSize} players for ${teamName}.`);
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
    await onPerformAction(bk => bk.undo());
    // After undo, the view might change, or pre-selection logic might need to re-run.
    // LocalGame's handlePerformBookkeeperAction will manage the view.
    // The useEffect in this component will re-evaluate pre-selection based on new bookkeeper state.
  };

  const handleRecordHalf = async () => {
    if (bookkeeper.pointsAtHalf > 0) {
        alert("Half has already been recorded.");
        return;
    }
    // Consider adding a confirmation dialog if desired
    // if (window.confirm("Are you sure you want to record half time?")) {
    await onPerformAction(bk => bk.recordHalf());
    alert("Half time recorded."); // Simple feedback
    // }
  };


  const renderPlayerButton = (playerName: string, isHomeTeam: boolean) => {
    const selectedList = isHomeTeam ? selectedHomePlayers : selectedAwayPlayers;
    const isSelected = selectedList.includes(playerName);

    return (
      <button
        key={playerName}
        onClick={() => togglePlayerSelection(playerName, isHomeTeam)}
        style={{
          display: 'block',
          width: '100%',
          padding: '10px',
          marginBottom: '5px',
          textAlign: 'left',
          backgroundColor: isSelected ? '#cce7ff' : '#f0f0f0', 
          border: isSelected ? '1px solid #007bff' : '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: isSelected ? 'bold' : 'normal',
        }}
      >
        {playerName}
      </button>
    );
  };

  const buttonText = isResumingPointMode ? "Resume Point" : "Confirm Lines & Start Point";
  const helpText = isResumingPointMode 
    ? "Adjust the current line if needed, then click 'Resume Point'."
    : (lastPlayedLine 
        ? "Players not on the previous line are pre-selected. Adjust and confirm." 
        : "Select players for the first point.");

  const isHalfRecorded = bookkeeper.pointsAtHalf > 0;

  return (
    <div>
      <h3>{isResumingPointMode ? "Adjust Current Line" : "Select Lines for Next Point"}</h3>
      <p>Required players per team: {leagueLineSize}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'nowrap' }}>
        <div style={{ flex: 1, marginRight: '10px' }}>
          <h4>{bookkeeper.homeTeam.name} ({selectedHomePlayers.length}/{leagueLineSize})</h4>
          {homeRoster.map(player => renderPlayerButton(player, true))}
        </div>
        <div style={{ flex: 1, marginLeft: '10px' }}>
          <h4>{bookkeeper.awayTeam.name} ({selectedAwayPlayers.length}/{leagueLineSize})</h4>
          {awayRoster.map(player => renderPlayerButton(player, false))}
        </div>
      </div>
      <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <button
          onClick={handleDone}
          disabled={selectedHomePlayers.length === 0 || selectedAwayPlayers.length === 0}
          style={{ padding: '10px 15px', fontSize: '16px', backgroundColor: 'green', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {buttonText}
        </button>
        {bookkeeper.getMementosCount() > 0 && (
           <button
              onClick={handleUndoLastAction}
              style={{ padding: '10px 15px', fontSize: '16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}
            >
             Undo Last Action
           </button>
        )}
        <button
            onClick={handleRecordHalf}
            disabled={isHalfRecorded}
            style={{ padding: '10px 15px', fontSize: '16px', backgroundColor: isHalfRecorded ? '#cccccc' : '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
            title={isHalfRecorded ? "Half time has already been recorded" : "Record Half Time"}
        >
            Record Half
        </button>
      </div>
      <p style={{marginTop: '15px', fontSize: '0.9em', color: 'gray'}}>
        {helpText}
        <br/>
        If a point was just scored, 'Undo Last Action' will revert the score and take you back to editing the last event of that point.
      </p>
    </div>
  );
};

export default SelectLines;
