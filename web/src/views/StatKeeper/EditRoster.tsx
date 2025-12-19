import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Autocomplete,
  Popper,
} from '@mui/material';
import { StoredPlayer } from './db';
import { TeamPlayer } from '../../api';
import { useSnackbar } from './notifications';

interface EditRosterProps {
  teamName: string;
  currentRoster: StoredPlayer[];
  originalRoster: StoredPlayer[]; // Reference to the original roster before any edits
  onRosterChange: (newRoster: StoredPlayer[]) => void;
  allLeaguePlayers: TeamPlayer[]; // Assumed to be pre-sorted by parent
  alignRight?: boolean; // For positioning the autocomplete dropdown
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

// Custom Popper component to make dropdown wider and positioned better for tablet
const createWidePopper = (alignRight: boolean = false) => {
  return (props: any) => {
    return (
      <Popper
        {...props}
        placement={alignRight ? 'bottom-end' : 'bottom-start'}
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 4],
            },
          },
          {
            name: 'preventOverflow',
            options: {
              padding: 8,
            },
          },
        ]}
        style={{
          ...props.style,
          width: 'min(500px, calc(100vw - 32px))', // Use more screen width, up to 500px
        }}
      />
    );
  };
};

// Component for adding a player (league player or custom substitute)
const AddPlayerForm: React.FC<{
  availablePlayers: TeamPlayer[];
  inputValue: string;
  onInputChange: (value: string) => void;
  selectedPlayer: TeamPlayer | null;
  onSelectPlayer: (player: TeamPlayer | null) => void;
  showGenderToggle: boolean;
  gender: boolean;
  onGenderChange: (isOpen: boolean) => void;
  onAddPlayer: () => void;
  alignRight?: boolean;
}> = ({
  availablePlayers,
  inputValue,
  onInputChange,
  selectedPlayer,
  onSelectPlayer,
  showGenderToggle,
  gender,
  onGenderChange,
  onAddPlayer,
  alignRight = false,
}) => {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5, fontSize: '0.95em' }}>
        Add Player
      </Typography>
      {/* Full-width autocomplete */}
      <Autocomplete
        freeSolo
        options={availablePlayers}
        getOptionLabel={option =>
          typeof option === 'string' ? option : `${option.name} (${option.team})`
        }
        renderOption={(props, option) => {
          const { key, ...optionProps } = props as any;
          return (
            <Box component="li" key={key} {...optionProps}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <span>{option.name}</span>
                <span style={{ color: '#888', fontSize: '0.9em' }}>({option.team})</span>
              </Box>
            </Box>
          );
        }}
        value={selectedPlayer}
        onChange={(_, newValue) => {
          if (typeof newValue === 'string') {
            onSelectPlayer(null);
          } else {
            onSelectPlayer(newValue);
          }
        }}
        inputValue={inputValue}
        onInputChange={(_, newInputValue) => {
          onInputChange(newInputValue);
        }}
        renderInput={params => (
          <TextField
            {...params}
            placeholder="Type to search or add new..."
            size="small"
            sx={{ fontSize: '0.9em' }}
          />
        )}
        PopperComponent={createWidePopper(alignRight)}
        ListboxProps={{
          style: {
            maxHeight: '40vh', // Dropdown height limited to 40% of viewport
          },
        }}
        sx={{ width: '100%', mb: 0.5 }}
        size="small"
      />
      {/* Gender toggle and Add button row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
        {showGenderToggle && (
          <FormControlLabel
            control={
              <Switch
                checked={gender}
                onChange={e => onGenderChange(e.target.checked)}
                size="small"
              />
            }
            label={gender ? 'ON2' : 'WN2'}
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
        )}
        <Button
          onClick={onAddPlayer}
          disabled={!inputValue.trim()}
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

const EditRoster: React.FC<EditRosterProps> = ({
  allLeaguePlayers,
  currentRoster,
  originalRoster,
  onRosterChange,
  alignRight = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<TeamPlayer | null>(null);
  const [newPlayerGender, setNewPlayerGender] = useState(true); // Default to open

  const { showSnackbar, SnackbarComponent } = useSnackbar();

  const currentRosterNames = currentRoster.map(p => p.name);

  // Filter out players already on the current roster
  const availablePlayers = allLeaguePlayers.filter(p => !currentRosterNames.includes(p.name));

  // Determine if we should show the gender toggle
  // Show it only when typing a new name (not selecting from dropdown)
  const showGenderToggle = inputValue.trim() !== '' && selectedPlayer === null;

  const handleRemovePlayer = (playerName: string) => {
    onRosterChange(currentRoster.filter(player => player.name !== playerName));
  };

  const handleAddPlayer = () => {
    if (!inputValue.trim()) {
      showSnackbar('Select or Enter a player name');
      return;
    }

    let newPlayer: StoredPlayer;

    // Adding a league player
    if (selectedPlayer) {
      const wasInOriginalRoster = originalRoster.some(p => p.name === selectedPlayer.name);
      const name = wasInOriginalRoster ? selectedPlayer.name : `${selectedPlayer.name}(S)`;
      newPlayer = {
        name: name,
        is_open: selectedPlayer.is_open,
      };
      // Adding a custom substitute (typed name not in league)
    } else {
      newPlayer = {
        name: `${inputValue.trim()}(S)`,
        is_open: newPlayerGender,
      };
    }

    if (currentRosterNames.includes(newPlayer.name)) {
      showSnackbar(`${newPlayer.name} is already on the roster.`);
      return;
    }

    onRosterChange([...currentRoster, newPlayer]);
    setInputValue('');
    setSelectedPlayer(null);
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
      <Box sx={{ flexShrink: 0 }}>
        <AddPlayerForm
          availablePlayers={availablePlayers}
          inputValue={inputValue}
          onInputChange={setInputValue}
          selectedPlayer={selectedPlayer}
          onSelectPlayer={setSelectedPlayer}
          showGenderToggle={showGenderToggle}
          gender={newPlayerGender}
          onGenderChange={setNewPlayerGender}
          onAddPlayer={handleAddPlayer}
          alignRight={alignRight}
        />
      </Box>

      <Typography variant="h6" sx={{ mb: 1, textAlign: 'center', flexShrink: 0, fontSize: '1rem' }}>
        {currentRoster.length} players
      </Typography>

      <PlayerList currentRoster={currentRoster} onRemovePlayer={handleRemovePlayer} />

      {SnackbarComponent}
    </Box>
  );
};

export default EditRoster;
