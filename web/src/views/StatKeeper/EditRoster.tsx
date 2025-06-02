import React, { useState, useEffect } from 'react';
import { TeamPlayer } from '../../api'; // Assuming TeamPlayer is defined in api.ts

interface EditRosterProps {
  teamName: string;
  initialRosterPlayers: TeamPlayer[]; // Players from the selected team
  allLeaguePlayers: TeamPlayer[]; // All players in the league for adding subs
  currentRosterNames: string[]; // Current list of names for this team's roster
  onRosterChange: (newRosterNames: string[]) => void;
}

const EditRoster: React.FC<EditRosterProps> = ({
  teamName,
  initialRosterPlayers,
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
      setSelectedLeaguePlayer(''); // Reset dropdown
    } else if (currentRosterNames.includes(selectedLeaguePlayer)) {
        alert(`${selectedLeaguePlayer} is already on the roster.`);
    }
  };
  
  // Effect to update currentRosterNames if initialRosterPlayers changes and it's the first load
  // This helps sync if the parent component re-selects a team
  useEffect(() => {
    const initialNames = initialRosterPlayers.map(p => p.name);
    // A simple way to check if it's a "reset" based on team selection rather than ongoing edits
    // This might need refinement based on how NewGameSetup manages state on team change
    if (JSON.stringify(initialNames.sort()) !== JSON.stringify(currentRosterNames.filter(name => initialRosterPlayers.find(p=>p.name === name)).sort())) {
         onRosterChange(initialNames);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRosterPlayers]); // Only re-run if the initial players prop changes


  return (
    <div style={{ border: '1px solid #e0e0e0', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
      <h4>{teamName} Roster ({currentRosterNames.length} players)</h4>
      <ul style={{ listStyleType: 'none', paddingLeft: 0, maxHeight: '200px', overflowY: 'auto' }}>
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
