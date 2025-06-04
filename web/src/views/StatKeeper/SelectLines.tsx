import React, { useState, useEffect } from 'react';
import { Bookkeeper } from './bookkeeper'

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

  const isFirstPointOfGameOrHalf = bookkeeper.activePoint === null &&
                                  (bookkeeper.activeGame.getPointCount() === 0 ||
                                   bookkeeper.activeGame.getPointCount() === bookkeeper['pointsAtHalf']); 

  useEffect(() => {
    if (bookkeeper.activePoint === null) { 
        // Logic for pre-selecting players (flipping) can be added here if desired.
        // For now, it defaults to manual selection.
        // Example: if a point was just scored, you might want to pre-select players
        // who were *not* in the last line. This requires more state from Bookkeeper
        // or passing previous line info.
    }
  }, [bookkeeper]); 


  const leagueLineSize = bookkeeper.league.lineSize;

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
          backgroundColor: isSelected ? '#cce7ff' : '#f0f0f0', // Light blue for selected, light grey for default
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

  return (
    <div>
      <h3>Select Lines for Next Point</h3>
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
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={handleDone}
          disabled={selectedHomePlayers.length === 0 || selectedAwayPlayers.length === 0}
          style={{ padding: '10px 15px', fontSize: '16px', marginRight: '10px', backgroundColor: 'green', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Confirm Lines & Start Point
        </button>
        {bookkeeper.getMementosCount() > 0 && (
           <button
              onClick={handleUndoLastAction}
              style={{ padding: '10px 15px', fontSize: '16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}
            >
             Undo Last Action
           </button>
        )}
      </div>
      <p style={{marginTop: '15px', fontSize: '0.9em', color: 'gray'}}>
        {isFirstPointOfGameOrHalf ? "Select players for the first point." : "Select players for the next point."}
        <br/>
        If a point was just scored, 'Undo Last Action' will revert the score and take you back to editing the last event of that point.
      </p>
    </div>
  );
};

export default SelectLines;
