import React from 'react';
import { StoredGame } from './db';

interface LineSelectionProps {
  gameData: StoredGame;
  selectedHomeLine: string[];
  selectedAwayLine: string[];
  leagueLineSize: number;
  // isHomePullingNext: boolean; // Removed
  onPlayerToggleLine: (player: string, isHomeTeam: boolean) => void;
  // onSetIsHomePullingNext: (isHomePulling: boolean) => void; // Removed
  onStartPoint: () => void;
  homeTeamName: string;
  awayTeamName: string;
}

const LineSelectionComponent: React.FC<LineSelectionProps> = ({
  gameData,
  selectedHomeLine,
  selectedAwayLine,
  leagueLineSize,
  // isHomePullingNext, // Removed
  onPlayerToggleLine,
  // onSetIsHomePullingNext, // Removed
  onStartPoint,
  homeTeamName,
  awayTeamName,
}) => {

  const renderPlayerButton = (player: string, isHomeTeamPlayerList: boolean) => {
    const isPlayerSelectedForLine = (isHomeTeamPlayerList ? selectedHomeLine : selectedAwayLine).includes(player);
    const buttonStyle: React.CSSProperties = { 
        margin: '5px', padding: '10px', cursor: 'pointer', 
        width: 'calc(100% - 10px)', 
        textAlign: 'center', borderRadius: '4px',
        boxSizing: 'border-box',
        backgroundColor: isPlayerSelectedForLine ? '#d4edda' : '#f8f9fa',
        borderColor: isPlayerSelectedForLine ? '#c3e6cb' : '#ced4da',
        borderWidth: '1px',
        borderStyle: 'solid'
    };

    return (
      <button
        key={player}
        onClick={() => onPlayerToggleLine(player, isHomeTeamPlayerList)}
        style={buttonStyle}
      >
        {player}
      </button>
    );
  };

  return (
    <>
      <div style={{ width: '45%', textAlign: 'center' }}> 
        <h3>{homeTeamName} ({selectedHomeLine.length}/{leagueLineSize})</h3>
        {/* Removed maxHeight and overflowY to show all players */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid #eee', padding: '5px' }}>
          {(gameData.homeRoster || []).map(player =>
            renderPlayerButton(player, true)
          )}
        </div>
      </div>

      <div style={{ width: '45%', textAlign: 'center' }}> 
        <h3>{awayTeamName} ({selectedAwayLine.length}/{leagueLineSize})</h3>
        {/* Removed maxHeight and overflowY to show all players */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid #eee', padding: '5px' }}>
          {(gameData.awayRoster || []).map(player =>
            renderPlayerButton(player, false)
          )}
        </div>
      </div>
      
      {/* "Who is Pulling?" section removed */}
      
      <div style={{ width: '100%', textAlign: 'center', marginTop: '20px' }}>
        <button 
            onClick={onStartPoint} 
            style={{ padding: '10px 15px', fontSize: '1.1em' }}
            disabled={selectedHomeLine.length === 0 || selectedAwayLine.length === 0}
        >
          {selectedHomeLine.length >= leagueLineSize && selectedAwayLine.length >= leagueLineSize 
            ? `Confirm Lines & Start Point (${leagueLineSize})` 
            : `Confirm Lines & Start Point (${selectedHomeLine.length}/${selectedAwayLine.length})`}
        </button>
      </div>
    </>
  );
};

export default LineSelectionComponent;
