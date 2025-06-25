import React, { useState } from 'react';
import { TeamPlayer } from '../../api';
import { Box, Button, Typography } from '@mui/material';

interface EditRosterProps {
  teamName: string;
  allLeaguePlayers: TeamPlayer[]; // Assumed to be pre-sorted by parent
  currentRosterNames: string[]; // Assumed to be pre-sorted by parent
  onRosterChange: (newRosterNames: string[]) => void; // Parent will handle sorting after update
}

// Component for a single player row in the roster list
const PlayerListItem: React.FC<{
  playerName: string;
  onRemove: (playerName: string) => void;
}> = ({ playerName, onRemove }) => {
  return (
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
        onClick={() => onRemove(playerName)}
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
  );
};

// Component for the empty roster state
const EmptyRosterMessage: React.FC = () => (
  <Box component="li" sx={{ textAlign: 'center', color: 'text.secondary', p: 1.25 }}>
    <Typography variant="body2">No players on roster.</Typography>
  </Box>
);

// Component for the player list section
const PlayerList: React.FC<{
  currentRosterNames: string[];
  onRemovePlayer: (playerName: string) => void;
}> = ({ currentRosterNames, onRemovePlayer }) => {
  return (
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
      {currentRosterNames.length > 0 ? (
        currentRosterNames.map(playerName => (
          <PlayerListItem key={playerName} playerName={playerName} onRemove={onRemovePlayer} />
        ))
      ) : (
        <EmptyRosterMessage />
      )}
    </Box>
  );
};

// Component for adding a league player
const AddLeaguePlayerForm: React.FC<{
  availablePlayers: TeamPlayer[];
  selectedPlayer: string;
  onSelectPlayer: (player: string) => void;
  onAddPlayer: () => void;
}> = ({ availablePlayers, selectedPlayer, onSelectPlayer, onAddPlayer }) => {
  return (
    <Box sx={{ mb: 1.25 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5, fontSize: '0.95em' }}>
        Add Player from League
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box
          component="select"
          value={selectedPlayer}
          onChange={e => onSelectPlayer(e.target.value)}
          sx={{
            flexGrow: 1,
            p: '6px',
            fontSize: '0.9em',
            minWidth: '100px',
            borderRadius: 1,
            border: '1px solid #ccc',
          }}
        >
          <option value="">Select Player</option>
          {availablePlayers.map(player => (
            <option key={player.name} value={player.name}>
              {player.name} ({player.team})
            </option>
          ))}
        </Box>
        <Button
          onClick={onAddPlayer}
          disabled={!selectedPlayer}
          variant="outlined"
          size="small"
          sx={{ fontSize: '0.9em', flexShrink: 0 }}
        >
          Add
        </Button>
      </Box>
    </Box>
  );
};

// Component for adding a custom substitute
const AddSubstituteForm: React.FC<{
  newSubName: string;
  onSubNameChange: (name: string) => void;
  onAddSub: () => void;
}> = ({ newSubName, onSubNameChange, onAddSub }) => {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5, fontSize: '0.95em' }}>
        Add Custom Substitute
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box
          component="input"
          type="text"
          value={newSubName}
          onChange={e => onSubNameChange(e.target.value)}
          placeholder="Substitute name"
          sx={{
            flexGrow: 1,
            p: '6px',
            fontSize: '0.9em',
            minWidth: '100px',
            borderRadius: 1,
            border: '1px solid #ccc',
          }}
        />
        <Button
          onClick={onAddSub}
          disabled={!newSubName.trim()}
          variant="outlined"
          size="small"
          sx={{ fontSize: '0.9em', flexShrink: 0 }}
        >
          Add Sub
        </Button>
      </Box>
    </Box>
  );
};

const EditRoster: React.FC<EditRosterProps> = ({
  allLeaguePlayers,
  currentRosterNames,
  onRosterChange,
}) => {
  const [newSubName, setNewSubName] = useState('');
  const [selectedLeaguePlayer, setSelectedLeaguePlayer] = useState('');

  // Filter out players already on the current roster for the dropdown
  const availableLeaguePlayersForDropdown = allLeaguePlayers.filter(
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
        {currentRosterNames.length} players
      </Typography>

      {/* Scrollable Player List */}
      <PlayerList currentRosterNames={currentRosterNames} onRemovePlayer={handleRemovePlayer} />

      {/* Add Player Sections */}
      <Box sx={{ flexShrink: 0 }}>
        <AddLeaguePlayerForm
          availablePlayers={availableLeaguePlayersForDropdown}
          selectedPlayer={selectedLeaguePlayer}
          onSelectPlayer={setSelectedLeaguePlayer}
          onAddPlayer={handleAddLeaguePlayer}
        />
        <AddSubstituteForm
          newSubName={newSubName}
          onSubNameChange={setNewSubName}
          onAddSub={handleAddSubByName}
        />
      </Box>
    </Box>
  );
};

export default EditRoster;
