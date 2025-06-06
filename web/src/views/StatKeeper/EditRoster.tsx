import React, { useState } from 'react';
import { TeamPlayer } from '../../api';

interface EditRosterProps {
  teamName: string;
  allLeaguePlayers: TeamPlayer[]; // Assumed to be pre-sorted by parent
  currentRosterNames: string[]; // Assumed to be pre-sorted by parent
  onRosterChange: (newRosterNames: string[]) => void; // Parent will handle sorting after update
}

const EditRoster: React.FC<EditRosterProps> = ({
  teamName,
  allLeaguePlayers,
  currentRosterNames,
  onRosterChange,
}) => {
  const [newSubName, setNewSubName] = useState('');
  const [selectedLeaguePlayer, setSelectedLeaguePlayer] = useState('');

  // Filter out players already on the current roster for the dropdown
  // allLeaguePlayers is already sorted, so this will maintain a semblance of that order
  // or could be re-sorted if desired, but the parent sorts the final list.
  const availableLeaguePlayersForDropdown = allLeaguePlayers.filter(
    p => !currentRosterNames.includes(p.name)
  );
  // The dropdown itself will be sorted by name if allLeaguePlayers is sorted.

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
    <Box
      sx={{
        border: '1px solid #e0e0e0',
        p: 1.25,
        borderRadius: 1,
        bgcolor: '#f9f9f9',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Typography variant="h6" sx={{ mb: 1, textAlign: 'center', flexShrink: 0, fontSize: '1rem' }}>
        {teamName} Roster ({currentRosterNames.length} players)
      </Typography>

      {/* Scrollable Player List - currentRosterNames is already sorted by parent */}
      <Box
        component="ul"
        sx={{
          listStyleType: 'none',
          pl: 0,
          m: 0,
          flexGrow: 1,
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: 1,
          p: 0.5,
          mb: 1,
        }}
      >
        {currentRosterNames.map(playerName => (
          <Box
            component="li"
            key={playerName}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: '6px 4px',
              fontSize: '0.9em',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <Typography variant="body2">{playerName}</Typography>
            <Button
              onClick={() => handleRemovePlayer(playerName)}
              color="error"
              size="small"
              sx={{
                minWidth: 'auto',
                p: '2px 4px',
                fontSize: '0.8em',
              }}
            >
              Remove
            </Button>
          </Box>
        ))}
        {currentRosterNames.length === 0 && (
          <Box
            component="li"
            sx={{ textAlign: 'center', color: 'text.secondary', p: 1.25 }}
          >
            <Typography variant="body2">No players on roster.</Typography>
          </Box>
        )}
      </Box>

      {/* Add Player Sections */}
      <Box sx={{ flexShrink: 0 }}>
        <Box sx={{ mb: 1.25 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5, fontSize: '0.95em' }}>
            Add Player from League
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              component="select"
              value={selectedLeaguePlayer}
              onChange={e => setSelectedLeaguePlayer(e.target.value)}
              sx={{ 
                flexGrow: 1, 
                p: '6px', 
                fontSize: '0.9em', 
                minWidth: '100px',
                borderRadius: 1,
                border: '1px solid #ccc'
              }}
            >
              <option value="">Select Player</option>
              {/* availableLeaguePlayersForDropdown is derived from sorted allLeaguePlayers */}
              {availableLeaguePlayersForDropdown.map(player => (
                <option key={player.name} value={player.name}>
                  {player.name} ({player.team})
                </option>
              ))}
            </Box>
            <Button
              onClick={handleAddLeaguePlayer}
              disabled={!selectedLeaguePlayer}
              variant="outlined"
              size="small"
              sx={{ fontSize: '0.9em', flexShrink: 0 }}
            >
              Add
            </Button>
          </Box>
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5, fontSize: '0.95em' }}>
            Add Custom Substitute
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              component="input"
              type="text"
              value={newSubName}
              onChange={e => setNewSubName(e.target.value)}
              placeholder="Substitute name"
              sx={{ 
                flexGrow: 1, 
                p: '6px', 
                fontSize: '0.9em', 
                minWidth: '100px',
                borderRadius: 1,
                border: '1px solid #ccc'
              }}
            />
            <Button
              onClick={handleAddSubByName}
              disabled={!newSubName.trim()}
              variant="outlined"
              size="small"
              sx={{ fontSize: '0.9em', flexShrink: 0 }}
            >
              Add Sub
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default EditRoster;
