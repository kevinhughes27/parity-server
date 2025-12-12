import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert,
} from '@mui/material';
import { StoredPlayer } from './db';
import { TeamPlayer } from '../../api';

interface EditRosterProps {
  teamName: string;
  currentRoster: StoredPlayer[];
  originalRoster: StoredPlayer[]; // Reference to the original roster before any edits
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
  newSubGender: boolean; // true for ON2, false for WN2
  onSubNameChange: (name: string) => void;
  onSubGenderChange: (isOpen: boolean) => void;
  onAddSub: () => void;
}> = ({ newSubName, newSubGender, onSubNameChange, onSubGenderChange, onAddSub }) => {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5, fontSize: '0.95em' }}>
        Add Custom Substitute
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          value={newSubName}
          onChange={e => onSubNameChange(e.target.value)}
          placeholder="Name"
          size="small"
          sx={{ flexGrow: 1, fontSize: '0.9em' }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={newSubGender}
              onChange={e => onSubGenderChange(e.target.checked)}
              size="small"
            />
          }
          label={newSubGender ? 'ON2' : 'WN2'}
          labelPlacement="start"
          sx={{
            m: 0,
            fontSize: '0.9em',
            '& .MuiFormControlLabel-label': {
              fontSize: '0.9em',
              fontWeight: 500,
              minWidth: '35px',
            },
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
  currentRoster,
  originalRoster,
  onRosterChange,
}) => {
  const [newSubName, setNewSubName] = useState('');
  const [newSubGender, setNewSubGender] = useState(true); // Default to open
  const [selectedLeaguePlayer, setSelectedLeaguePlayer] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  const currentRosterNames = currentRoster.map(p => p.name);

  const showSnackbar = (message: string) => {
    setSnackbar({ open: true, message });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

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
      showSnackbar(`${newSubName.trim()} is already on the roster.`);
    }
  };

  const handleAddLeaguePlayer = () => {
    if (selectedLeaguePlayer && !currentRosterNames.includes(selectedLeaguePlayer)) {
      const leaguePlayer = allLeaguePlayers.find(p => p.name === selectedLeaguePlayer);
      if (leaguePlayer) {
        const wasInOriginalRoster = originalRoster.some(p => p.name === leaguePlayer.name);
        const name = wasInOriginalRoster ? leaguePlayer.name : `${leaguePlayer.name}(S)`;
        const newPlayer: StoredPlayer = { name: name, is_open: leaguePlayer.is_open };
        onRosterChange([...currentRoster, newPlayer]);
        setSelectedLeaguePlayer('');
      }
    } else if (currentRosterNames.includes(selectedLeaguePlayer)) {
      showSnackbar(`${selectedLeaguePlayer} is already on the roster.`);
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="warning"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EditRoster;
