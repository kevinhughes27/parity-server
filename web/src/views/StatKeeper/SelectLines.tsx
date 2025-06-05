import React, { useState, useEffect } from 'react';
import { Bookkeeper } from './bookkeeper';
import PointEventsDisplay from './PointEventsDisplay';

interface SelectLinesProps {
  bookkeeper: Bookkeeper;
  homeRoster: string[]; // Assumed to be pre-sorted by parent (LocalGame)
  awayRoster: string[]; // Assumed to be pre-sorted by parent (LocalGame)
  onPerformAction: (
    action: (bk: Bookkeeper) => void,
    options?: { skipViewChange?: boolean; skipSave?: boolean }
  ) => Promise<void>;
  onLinesSelected: () => void;
  isResumingPointMode: boolean;
  lastPlayedLine: { home: string[]; away: string[] } | null;
  lastCompletedPointEvents: string[] | null;
  actionBarHeight: string; // Added prop
}

const SelectLines: React.FC<SelectLinesProps> = ({
  bookkeeper,
  homeRoster, // Already sorted
  awayRoster, // Already sorted
  onPerformAction,
  onLinesSelected,
  isResumingPointMode,
  lastPlayedLine,
  lastCompletedPointEvents,
  actionBarHeight,
}) => {
  const [selectedHomePlayers, setSelectedHomePlayers] = useState<string[]>([]);
  const [selectedAwayPlayers, setSelectedAwayPlayers] = useState<string[]>([]);

  const leagueLineSize = bookkeeper.league.lineSize;

  useEffect(() => {
    if (isResumingPointMode) {
      setSelectedHomePlayers(bookkeeper.homePlayers || []);
      setSelectedAwayPlayers(bookkeeper.awayPlayers || []);
    } else if (lastPlayedLine) {
      // Pre-select players NOT on the last played line.
      // homeRoster and awayRoster are already sorted.
      setSelectedHomePlayers(homeRoster.filter(p => !lastPlayedLine.home.includes(p)));
      setSelectedAwayPlayers(awayRoster.filter(p => !lastPlayedLine.away.includes(p)));
    } else {
      setSelectedHomePlayers([]);
      setSelectedAwayPlayers([]);
    }
  }, [
    isResumingPointMode,
    lastPlayedLine,
    bookkeeper.homePlayers,
    bookkeeper.awayPlayers,
    homeRoster,
    awayRoster,
  ]);

  const togglePlayerSelection = (playerName: string, isHomeTeam: boolean) => {
    const currentSelection = isHomeTeam ? selectedHomePlayers : selectedAwayPlayers;
    const setter = isHomeTeam ? setSelectedHomePlayers : setSelectedAwayPlayers;
    const teamName = isHomeTeam ? bookkeeper.homeTeam.name : bookkeeper.awayTeam.name;

    let newSelection;
    if (currentSelection.includes(playerName)) {
      newSelection = currentSelection.filter(p => p !== playerName);
    } else {
      if (currentSelection.length < leagueLineSize) {
        newSelection = [...currentSelection, playerName];
      } else {
        alert(`Cannot select more than ${leagueLineSize} players for ${teamName}.`);
        return; // Do not update selection
      }
    }
    // Sort the selection before setting state, though this is mainly for internal consistency
    // as the display order is driven by the main roster lists.
    setter(newSelection.sort((a, b) => a.localeCompare(b)));
  };

  const handleDone = async () => {
    const leftPlayerCount = selectedHomePlayers.length;
    const rightPlayerCount = selectedAwayPlayers.length;

    const leftCorrectNumPlayers = leftPlayerCount === leagueLineSize;
    const rightCorrectNumPlayers = rightPlayerCount === leagueLineSize;

    if (leftCorrectNumPlayers && rightCorrectNumPlayers) {
      await onPerformAction(
        // Pass sorted selections to bookkeeper
        bk => bk.recordActivePlayers([...selectedHomePlayers].sort((a,b)=>a.localeCompare(b)), [...selectedAwayPlayers].sort((a,b)=>a.localeCompare(b))),
        { skipViewChange: true, skipSave: false }
      );
      onLinesSelected();
    } else {
      let message = 'Incorrect number of players:';
      if (!leftCorrectNumPlayers) {
        message += `\n${bookkeeper.homeTeam.name}: ${leftPlayerCount}/${leagueLineSize} selected`;
      }
      if (!rightCorrectNumPlayers) {
        message += `\n${bookkeeper.awayTeam.name}: ${rightPlayerCount}/${leagueLineSize} selected`;
      }
      message += '\n\nContinue with these players anyway?';

      if (window.confirm(message)) {
        await onPerformAction(
          // Pass sorted selections to bookkeeper
          bk => bk.recordActivePlayers([...selectedHomePlayers].sort((a,b)=>a.localeCompare(b)), [...selectedAwayPlayers].sort((a,b)=>a.localeCompare(b))),
          { skipViewChange: true, skipSave: false }
        );
        onLinesSelected();
      }
    }
  };

  const handleUndoLastAction = async () => {
    await onPerformAction(bk => bk.undo());
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
          padding: '8px', // Reduced padding
          fontSize: '0.9em', // Slightly smaller font
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

  const buttonText = isResumingPointMode ? 'Resume Point' : 'Confirm Lines & Start Point';
  const helpText = isResumingPointMode
    ? "Adjust the current line if needed, then click 'Resume Point'."
    : lastPlayedLine
      ? 'Players not on the previous line are pre-selected. Adjust and confirm.'
      : 'Select players for the first point.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px' }}> {/* Added padding to overall component */}
      {/* Scrollable Content Area */}
      <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '10px' }}>
        <h3>{isResumingPointMode ? 'Adjust Current Line' : 'Select Lines for Next Point'}</h3>
        <p>Required players per team: {leagueLineSize}</p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'nowrap',
            minHeight: '200px', // Adjusted minHeight
            overflow: 'hidden', // Children handle their own scroll
          }}
        >
          <div style={{ flex: 1, marginRight: '10px', overflowY: 'auto', height: '100%' }}>
            <h4>
              {bookkeeper.homeTeam.name} ({selectedHomePlayers.length}/{leagueLineSize})
            </h4>
            {/* homeRoster is already sorted by LocalGame */}
            {homeRoster.map(player => renderPlayerButton(player, true))}
          </div>

          <PointEventsDisplay title="Events from Last Point" events={lastCompletedPointEvents} />

          <div style={{ flex: 1, marginLeft: '10px', overflowY: 'auto', height: '100%' }}>
            <h4>
              {bookkeeper.awayTeam.name} ({selectedAwayPlayers.length}/{leagueLineSize})
            </h4>
            {/* awayRoster is already sorted by LocalGame */}
            {awayRoster.map(player => renderPlayerButton(player, false))}
          </div>
        </div>
        <p style={{ marginTop: '15px', fontSize: '0.9em', color: 'gray' }}>
          {helpText}
          <br />
          If a point was just scored, 'Undo Last Action' will revert the score and take you back to
          editing the last event of that point.
        </p>
      </div>

      {/* Fixed Action Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: actionBarHeight,
          padding: '10px 15px',
          backgroundColor: 'white',
          borderTop: '1px solid #ccc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between', // Use space-between for two groups
          boxSizing: 'border-box',
          zIndex: 100,
        }}
      >
        <button
          onClick={handleDone}
          disabled={selectedHomePlayers.length === 0 || selectedAwayPlayers.length === 0}
          style={{
            padding: '10px 15px',
            fontSize: '1em', // Adjusted font size
            backgroundColor: 'green',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px', // Add some margin if needed
          }}
        >
          {buttonText}
        </button>
        {bookkeeper.getMementosCount() > 0 && (
          <button
            onClick={handleUndoLastAction}
            style={{
              padding: '10px 15px',
              fontSize: '1em', // Adjusted font size
              backgroundColor: '#ff9800', // Consistent Undo color
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            Undo Last Action
          </button>
        )}
      </div>
    </div>
  );
};

export default SelectLines;
