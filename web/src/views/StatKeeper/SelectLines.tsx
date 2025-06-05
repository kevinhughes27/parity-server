import React, { useState, useEffect } from 'react';
import { Bookkeeper } from './bookkeeper';
import PointEventsDisplay from './PointEventsDisplay'; // Import the new component
// StoredGame import removed as gameStatus is no longer a prop

interface SelectLinesProps {
  bookkeeper: Bookkeeper;
  homeRoster: string[]; // Full team roster
  awayRoster: string[]; // Full team roster
  onPerformAction: (
    action: (bk: Bookkeeper) => void,
    options?: { skipViewChange?: boolean; skipSave?: boolean }
  ) => Promise<void>;
  onLinesSelected: () => void;
  isResumingPointMode: boolean;
  lastPlayedLine: { home: string[]; away: string[] } | null;
  lastCompletedPointEvents: string[] | null; // New prop for previous point's events
  // onSubmitGame and gameStatus props are removed
}

const SelectLines: React.FC<SelectLinesProps> = ({
  bookkeeper,
  homeRoster,
  awayRoster,
  onPerformAction,
  onLinesSelected,
  isResumingPointMode,
  lastPlayedLine,
  lastCompletedPointEvents,
  // onSubmitGame and gameStatus are destructured out as they are no longer used
}) => {
  const [selectedHomePlayers, setSelectedHomePlayers] = useState<string[]>([]);
  const [selectedAwayPlayers, setSelectedAwayPlayers] = useState<string[]>([]);

  const leagueLineSize = bookkeeper.league.lineSize;

  useEffect(() => {
    if (isResumingPointMode) {
      setSelectedHomePlayers(bookkeeper.homePlayers || []);
      setSelectedAwayPlayers(bookkeeper.awayPlayers || []);
    } else if (lastPlayedLine) {
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

    if (currentSelection.includes(playerName)) {
      setter(currentSelection.filter(p => p !== playerName));
    } else {
      if (currentSelection.length < leagueLineSize) {
        setter([...currentSelection, playerName]);
      } else {
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
      await onPerformAction(
        bk => bk.recordActivePlayers(selectedHomePlayers, selectedAwayPlayers),
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
          bk => bk.recordActivePlayers(selectedHomePlayers, selectedAwayPlayers),
          { skipViewChange: true, skipSave: false }
        );
        onLinesSelected();
      }
    }
  };

  const handleUndoLastAction = async () => {
    await onPerformAction(bk => bk.undo());
  };

  // handleRecordHalf removed

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

  const buttonText = isResumingPointMode ? 'Resume Point' : 'Confirm Lines & Start Point';
  const helpText = isResumingPointMode
    ? "Adjust the current line if needed, then click 'Resume Point'."
    : lastPlayedLine
      ? 'Players not on the previous line are pre-selected. Adjust and confirm.'
      : 'Select players for the first point.';

  // isHalfRecorded and canSubmitGame logic removed

  return (
    <div>
      <h3>{isResumingPointMode ? 'Adjust Current Line' : 'Select Lines for Next Point'}</h3>
      <p>Required players per team: {leagueLineSize}</p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'nowrap', // Ensure side-by-side layout
          minHeight: '300px', // Give some default height for the content area
          maxHeight: 'calc(100vh - 300px)', // Prevent excessive height
          overflow: 'hidden', // Child overflowY will handle scrolling
        }}
      >
        <div style={{ flex: 1, marginRight: '10px', overflowY: 'auto', height: '100%' }}>
          <h4>
            {bookkeeper.homeTeam.name} ({selectedHomePlayers.length}/{leagueLineSize})
          </h4>
          {homeRoster.map(player => renderPlayerButton(player, true))}
        </div>

        <PointEventsDisplay title="Events from Last Point" events={lastCompletedPointEvents} />

        <div style={{ flex: 1, marginLeft: '10px', overflowY: 'auto', height: '100%' }}>
          <h4>
            {bookkeeper.awayTeam.name} ({selectedAwayPlayers.length}/{leagueLineSize})
          </h4>
          {awayRoster.map(player => renderPlayerButton(player, false))}
        </div>
      </div>
      <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <button
          onClick={handleDone}
          disabled={selectedHomePlayers.length === 0 || selectedAwayPlayers.length === 0}
          style={{
            padding: '10px 15px',
            fontSize: '16px',
            backgroundColor: 'green',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          {buttonText}
        </button>
        {bookkeeper.getMementosCount() > 0 && (
          <button
            onClick={handleUndoLastAction}
            style={{
              padding: '10px 15px',
              fontSize: '16px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            Undo Last Action
          </button>
        )}
        {/* Record Half and Submit Game buttons removed */}
      </div>
      <p style={{ marginTop: '15px', fontSize: '0.9em', color: 'gray' }}>
        {helpText}
        <br />
        If a point was just scored, 'Undo Last Action' will revert the score and take you back to
        editing the last event of that point.
      </p>
    </div>
  );
};

export default SelectLines;
