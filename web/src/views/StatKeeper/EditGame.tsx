import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Bookkeeper, GameState } from './bookkeeper';
import { StoredGame } from './db';
import SelectLines from './SelectLines';
import RecordStats from './RecordStats';
import EditRosters from './EditRosters';
import MenuIcon from '@mui/icons-material/Menu';

interface EditGameProps {
  bookkeeper: Bookkeeper;
  localGameId: string;
}

interface ActionsMenuProps {
  numericGameId: number | undefined;
  gameStatus: StoredGame['status'] | undefined;
  isHalfRecorded: boolean;
  currentGameState: GameState;
  onRecordHalf: () => Promise<void>;
  onSubmitGame: () => Promise<void>;
  onChangeLine: () => void;
  onEditRosters: () => void;
}

const ActionsMenu: React.FC<ActionsMenuProps> = ({
  numericGameId,
  gameStatus,
  isHalfRecorded,
  currentGameState,
  onRecordHalf,
  onSubmitGame,
  onChangeLine,
  onEditRosters,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const canSubmitGame = gameStatus !== 'submitted' && gameStatus !== 'uploaded';

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAction = async (action: () => Promise<void> | void) => {
    await action();
    handleClose();
  };

  if (!numericGameId) return null;

  return (
    <Box>
      <IconButton onClick={handleClick} size="medium" sx={{ border: '1px solid #ccc' }}>
        <MenuIcon />
      </IconButton>

      <Menu id="game-actions-menu" anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={() => handleAction(onEditRosters)}>Edit Rosters</MenuItem>

        <MenuItem 
          onClick={() => handleAction(onChangeLine)}
          disabled={currentGameState === GameState.SelectingLines}
          sx={{ color: currentGameState === GameState.SelectingLines ? '#999' : 'inherit' }}
        >
          Change Line
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={() => handleAction(onRecordHalf)}
          disabled={isHalfRecorded}
          sx={{ color: isHalfRecorded ? '#999' : 'inherit' }}
        >
          Record Half
        </MenuItem>

        <MenuItem
          onClick={() => handleAction(onSubmitGame)}
          disabled={!canSubmitGame}
          sx={{ color: !canSubmitGame ? '#999' : 'inherit' }}
        >
          Submit Game
        </MenuItem>
      </Menu>
    </Box>
  );
};

function EditGame({ bookkeeper, localGameId }: EditGameProps) {
  const navigate = useNavigate();
  const currentView = bookkeeper.getCurrentView();
  const currentGameState = bookkeeper.gameState();
  const isHalfRecorded = bookkeeper.pointsAtHalf > 0;

  const handleRecordHalf = async () => {
    if (isHalfRecorded) {
      alert('Half has already been recorded.');
      return;
    }
    await bookkeeper.recordHalf();
    alert('Half time recorded.');
  };

  const handleSubmitGame = async () => {
    try {
      await bookkeeper.submitGame();
      alert('Game submitted and uploaded successfully!');
    } catch (error) {
      alert(`Game submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Submission error:', error);
    } finally {
      // Always redirect to StatKeeper home regardless of success or failure
      navigate('/stat_keeper');
    }
  };

  const handleChangeLine = async () => {
    const currentGameState = bookkeeper.gameState();
    if (currentGameState === GameState.SelectingLines) {
      return;
    }

    // Force transition to line selection by clearing players
    bookkeeper.homePlayers = null;
    bookkeeper.awayPlayers = null;
    bookkeeper.notifyListeners();
  };

  const handleEditRosters = async () => {
    if (currentView === 'editRosters') {
      return;
    }

    // Force transition to edit rosters by setting error state temporarily
    // This is a temporary solution until we implement proper roster editing state
    bookkeeper.setError('editRosters'); // Use error state as a hack for now
    bookkeeper.notifyListeners();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopBar
        bookkeeper={bookkeeper}
        localGameId={localGameId}
        currentGameState={currentGameState}
        isHalfRecorded={isHalfRecorded}
        onRecordHalf={handleRecordHalf}
        onSubmitGame={handleSubmitGame}
        onChangeLine={handleChangeLine}
        onEditRosters={handleEditRosters}
      />
      <MainContent bookkeeper={bookkeeper} currentView={currentView} />
    </Box>
  );
}

function TopBar({
  bookkeeper,
  localGameId,
  currentGameState,
  isHalfRecorded,
  onRecordHalf,
  onSubmitGame,
  onChangeLine,
  onEditRosters,
}: {
  bookkeeper: any;
  localGameId: string;
  currentGameState: GameState;
  isHalfRecorded: boolean;
  onRecordHalf: () => Promise<void>;
  onSubmitGame: () => Promise<void>;
  onChangeLine: () => Promise<void>;
  onEditRosters: () => Promise<void>;
}) {
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Link
          to="/stat_keeper"
          style={{
            fontSize: '0.9em',
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ArrowBackIcon fontSize="small" sx={{ mr: 0.5 }} /> StatKeeper Home
        </Link>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ActionsMenu
            numericGameId={parseInt(localGameId)}
            gameStatus={bookkeeper.getGameStatus()}
            currentGameState={currentGameState}
            isHalfRecorded={isHalfRecorded}
            onRecordHalf={onRecordHalf}
            onSubmitGame={onSubmitGame}
            onChangeLine={onChangeLine}
            onEditRosters={onEditRosters}
          />
        </Box>
      </Toolbar>
      <Box sx={{ textAlign: 'center', pb: 1 }}>
        <Typography variant="h5" sx={{ fontSize: '1.5em', mb: 0.5 }}>
          {bookkeeper.homeTeam.name} vs {bookkeeper.awayTeam.name}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '0.9em' }}>
          <strong>Score:</strong> {bookkeeper.homeScore} - {bookkeeper.awayScore}
        </Typography>
      </Box>
    </AppBar>
  );
}

function MainContent({ bookkeeper, currentView }: { bookkeeper: any; currentView: string }) {
  return (
    <Box
      sx={{
        flexGrow: 1,
        overflowY: 'auto',
        pb: '78px', // 70 for action bar + 8
        position: 'relative',
      }}
    >
      {currentView === 'selectLines' && <SelectLines bookkeeper={bookkeeper} />}

      {currentView === 'recordStats' && <RecordStats bookkeeper={bookkeeper} />}

      {currentView === 'editRosters' && <EditRosters bookkeeper={bookkeeper} />}
    </Box>
  );
}

export default EditGame;
