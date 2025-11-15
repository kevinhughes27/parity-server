import React, { useState } from 'react';
import {
  Box,
  List,
  ListItem,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { StoredPlayer } from './db';

interface EditRosterProps {
  teamName: string;
  currentRoster: StoredPlayer[];
  onRosterChange: (newRoster: StoredPlayer[]) => void;
  allLeaguePlayers: TeamPlayer[]; // Assumed to be pre-sorted by parent
}

// Component for a single player row in the roster list
const PlayerListItem: React.FC<{
  player: StoredPlayer;
  onRemove: (playerName: string) => void;
}> = ({ player, onRemove }) => {
  const borderColor = player.is_open ? '#2196f3' : '#ce93d8';

  return (
    <Box
      component="li"
      key={player.name}
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: '6px 4px',
        fontSize: '0.9em',
        borderBottom: '1px solid #f0f0f0',
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      <Typography
        variant="body2"
        sx={{
          whiteSpace: 'nowrap',
          overflowX: 'hidden',
        }}
      >
        {player.name}
      </Typography>
      <Button
        onClick={() => onRemove(player.name)}
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
    currentRoster: StoredPlayer[];
  onRemovePlayer: (playerName: string) => void;
}> = ({ currentRoster, onRemovePlayer }) => {
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
      {currentRoster.length > 0 ? (
        currentRoster.map(player => (
          <PlayerListItem key={player.name} player={player} onRemove={onRemovePlayer} />
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
  newSubGender: boolean; // true for open, false for women
  onSubNameChange: (name: string) => void;
  onSubGenderChange: (isOpen: boolean) => void;
  onAddSub: () => void;
}> = ({ newSubName, newSubGender, onSubNameChange, onSubGenderChange, onAddSub }) => {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5, fontSize: '0.95em' }}>
        Add Custom Substitute
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.0 }}>
        <TextField
          value={newSubName}
          onChange={e => onSubNameChange(e.target.value)}
          placeholder="Name"
          size="small"
          fullWidth
          sx={{ fontSize: '0.9em' }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FormControl sx={{ flexGrow: 1 }} size="small">
            <InputLabel sx={{ fontSize: '0.9em' }}>Gender</InputLabel>
            <Select
              value={newSubGender ? 'open' : 'women'}
              onChange={e => onSubGenderChange(e.target.value === 'open')}
              label="Gender"
              sx={{ fontSize: '0.9em' }}
            >
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="women">Women</MenuItem>
            </Select>
          </FormControl>
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
    </Box>
  );
};

const EditRoster: React.FC<EditRosterProps> = ({
  allLeaguePlayers,
  currentRoster,
  onRosterChange,
}) => {
  const [newSubName, setNewSubName] = useState('');
  const [newSubGender, setNewSubGender] = useState(true); // Default to open
  const [selectedLeaguePlayer, setSelectedLeaguePlayer] = useState('');

  const currentRosterNames = currentRoster.map(p => p.name);

  // Filter out players already on the current roster for the dropdown
  const availableLeaguePlayersForDropdown = allLeaguePlayers.filter(
    p => !currentRosterNames.includes(p.name)
  );

  const handleRemovePlayer = (playerName: string) => {
    onRosterChange(currentRoster.filter(player => player.name !== playerName));
  };

  const handleAddSubByName = () => {
    if (newSubName.trim() && !currentRosterNames.includes(newSubName.trim())) {
        const newPlayer: StoredPlayer = {
        name: `${newSubName.trim()}(S)`,
        is_open: newSubGender,
      };
      onRosterChange([...currentRoster, newPlayer]);
      setNewSubName('');
    } else if (currentRosterNames.includes(newSubName.trim())) {
      alert(`${newSubName.trim()} is already on the roster.`);
    }
  };

  const handleAddLeaguePlayer = () => {
    if (selectedLeaguePlayer && !currentRosterNames.includes(selectedLeaguePlayer)) {
      const leaguePlayer = allLeaguePlayers.find(p => p.name === selectedLeaguePlayer);
      if (leaguePlayer) {
      const newPlayer: StoredPlayer = {
          name: `${leaguePlayer.name}(S)`,
          is_open: leaguePlayer.is_open,
        };
        onRosterChange([...currentRoster, newPlayer]);
        setSelectedLeaguePlayer('');
      }
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
        {currentRoster.length} players
      </Typography>

      {/* Scrollable Player List */}
      <PlayerList currentRoster={currentRoster} onRemovePlayer={handleRemovePlayer} />

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
          newSubGender={newSubGender}
          onSubNameChange={setNewSubName}
          onSubGenderChange={setNewSubGender}
          onAddSub={handleAddSubByName}
        />
      </Box>
    </Box>
  );
};

export default EditRoster;
