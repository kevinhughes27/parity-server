import React, { useState } from 'react';
import { TeamPlayer } from '../../api';

interface EditRosterProps {
  teamName: string;
  allLeaguePlayers: TeamPlayer[];
  currentRosterNames: string[];
  onRosterChange: (newRosterNames: string[]) => void;
}

const EditRoster: React.FC<EditRosterProps> = ({
  teamName,
  allLeaguePlayers,
  currentRosterNames,
  onRosterChange,
}) => {
  const [newSubName, setNewSubName] = useState('');
  const [selectedLeaguePlayer, setSelectedLeaguePlayer] = useState('');

  const availableLeaguePlayers = allLeaguePlayers.filter(p => !currentRosterNames.includes(p.name));

  const handleRemovePlayer = (playerName: string) => {
    onRosterChange(currentRosterNames.filter(name => name !== playerName));
  };

  const handleAddSubByName = () => {
    if (newSubName.trim() && !currentRosterNames.includes(newSubName.trim())) {
      onRosterChange([...currentRosterNames, newSubName.trim()]);
      setNewSubName('');
    } else if (currentRosterNames.includes(newSubName.trim())) {
      alert(`${newSubName.trim()} is already on the roster.`);
    }
  };

  const handleAddLeaguePlayer = () => {
    if (selectedLeaguePlayer && !currentRosterNames.includes(selectedLeaguePlayer)) {
      onRosterChange([...currentRosterNames, selectedLeaguePlayer]);
      setSelectedLeaguePlayer('');
    } else if (currentRosterNames.includes(selectedLeaguePlayer)) {
      alert(`${selectedLeaguePlayer} is already on the roster.`);
    }
  };

  return (
    <div
      style={{
        border: '1px solid #e0e0e0',
        padding: '10px', // Reduced padding
        borderRadius: '5px',
        backgroundColor: '#f9f9f9', // Light background for each roster card
        display: 'flex',
        flexDirection: 'column',
        height: '100%', // Fill available height from parent
        overflow: 'hidden', // Ensure this container doesn't scroll
      }}
    >
      <h4 style={{ margin: '0 0 10px 0', textAlign: 'center', flexShrink: 0 }}>
        {teamName} Roster ({currentRosterNames.length} players)
      </h4>

      {/* Scrollable Player List */}
      <ul
        style={{
          listStyleType: 'none',
          paddingLeft: 0,
          margin: 0,
          flexGrow: 1, // Allow list to take available space
          overflowY: 'auto', // Make list scrollable
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '5px',
          marginBottom: '10px',
        }}
      >
        {currentRosterNames.map(playerName => (
          <li
            key={playerName}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 4px', // Compact padding
              fontSize: '0.9em',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <span>{playerName}</span>
            <button
              onClick={() => handleRemovePlayer(playerName)}
              style={{
                marginLeft: '8px',
                cursor: 'pointer',
                color: 'red',
                border: 'none',
                background: 'transparent',
                padding: '2px 4px', // Smaller button
                fontSize: '0.9em',
              }}
            >
              Remove
            </button>
          </li>
        ))}
        {currentRosterNames.length === 0 && <li style={{ textAlign: 'center', color: '#777', padding: '10px' }}>No players on roster.</li>}
      </ul>

      {/* Add Player Sections */}
      <div style={{ flexShrink: 0 }}> {/* Prevent add sections from growing */}
        <div style={{ marginBottom: '10px' }}>
          <h5 style={{ margin: '0 0 5px 0', fontSize: '0.95em' }}>Add Player from League</h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <select
              value={selectedLeaguePlayer}
              onChange={e => setSelectedLeaguePlayer(e.target.value)}
              style={{ flexGrow: 1, padding: '6px', fontSize: '0.9em', minWidth: '100px' }} // Allow select to grow
            >
              <option value="">Select Player</option>
              {availableLeaguePlayers.map(player => (
                <option key={player.name} value={player.name}>
                  {player.name} ({player.team})
                </option>
              ))}
            </select>
            <button
              onClick={handleAddLeaguePlayer}
              disabled={!selectedLeaguePlayer}
              style={{ padding: '6px 10px', fontSize: '0.9em', cursor: 'pointer', flexShrink: 0 }}
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <h5 style={{ margin: '0 0 5px 0', fontSize: '0.95em' }}>Add Custom Substitute</h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="text"
              value={newSubName}
              onChange={e => setNewSubName(e.target.value)}
              placeholder="Substitute name"
              style={{ flexGrow: 1, padding: '6px', fontSize: '0.9em', minWidth: '100px' }} // Allow input to grow
            />
            <button
              onClick={handleAddSubByName}
              disabled={!newSubName.trim()}
              style={{ padding: '6px 10px', fontSize: '0.9em', cursor: 'pointer', flexShrink: 0 }}
            >
              Add Sub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditRoster;
