import React, { useState } from 'react';
import { TeamPlayer } from '../../api';

interface EditRosterProps {
  teamName: string;
  allLeaguePlayers: TeamPlayer[];
  currentRosterNames: string[]
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

  // Filter out players already on the current roster from the "add league player" dropdown
  const availableLeaguePlayers = allLeaguePlayers.filter(
    p => !currentRosterNames.includes(p.name)
  );

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
    <div style={{ border: '1px solid #e0e0e0', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
      <h4>{teamName} Roster ({currentRosterNames.length} players)</h4>
      <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
        {currentRosterNames.map(playerName => (
          <li key={playerName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f0f0f0' }}>
            {playerName}
            <button onClick={() => handleRemovePlayer(playerName)} style={{ marginLeft: '10px', cursor: 'pointer', color: 'red', border: 'none', background: 'transparent' }}>
              Remove
            </button>
          </li>
        ))}
        {currentRosterNames.length === 0 && <li>No players on roster.</li>}
      </ul>

      <div style={{ marginTop: '15px' }}>
        <h5>Add Player from League</h5>
        <select
          value={selectedLeaguePlayer}
          onChange={(e) => setSelectedLeaguePlayer(e.target.value)}
          style={{ marginRight: '10px', padding: '5px' }}
        >
          <option value="">Select Player</option>
          {availableLeaguePlayers.map(player => (
            <option key={player.name} value={player.name}>
              {player.name} ({player.team})
            </option>
          ))}
        </select>
        <button onClick={handleAddLeaguePlayer} disabled={!selectedLeaguePlayer} style={{ padding: '5px 10px', cursor: 'pointer' }}>
          Add Selected Player
        </button>
      </div>

      <div style={{ marginTop: '15px' }}>
        <h5>Add Custom Substitute</h5>
        <input
          type="text"
          value={newSubName}
          onChange={(e) => setNewSubName(e.target.value)}
          placeholder="Enter substitute name"
          style={{ marginRight: '10px', padding: '5px' }}
        />
        <button onClick={handleAddSubByName} disabled={!newSubName.trim()} style={{ padding: '5px 10px', cursor: 'pointer' }}>
          Add Sub
        </button>
      </div>
    </div>
  );
};

export default EditRoster;
