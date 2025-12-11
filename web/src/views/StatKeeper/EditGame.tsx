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
  Snackbar,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
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

type SnackbarSeverity = 'success' | 'info' | 'warning' | 'error';

interface ActionsMenuProps {
  numericGameId: number | undefined;
  gameStatus: StoredGame['status'] | undefined;
  isHalfRecorded: boolean;
  isSubmitting: boolean;
  currentGameState: GameState;
  onRecordHalf: () => Promise<void>;
  onSubmitGame: () => Promise<void>;
  onChangeLine: () => void;
  onEditRosters: () => void;
  onEnterFullscreen: () => void;
}

const ActionsMenu: React.FC<ActionsMenuProps> = ({
  numericGameId,
  gameStatus,
  isHalfRecorded,
  isSubmitting,
  currentGameState,
  onRecordHalf,
  onSubmitGame,
  onChangeLine,
  onEditRosters,
  onEnterFullscreen,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const canSubmitGame = gameStatus !== 'submitted' && gameStatus !== 'uploaded' && !isSubmitting;

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
          disabled={
            currentGameState === GameState.SelectingLines ||
            currentGameState === GameState.EditingLines
          }
          sx={{
            color:
              currentGameState === GameState.SelectingLines ||
              currentGameState === GameState.EditingLines
                ? '#999'
                : 'inherit',
          }}
        >
          Change Line
        </MenuItem>

        <Divider />

        <MenuItem onClick={() => handleAction(onEnterFullscreen)}>
          <FullscreenIcon sx={{ mr: 1, fontSize: '1.2em' }} />
          Enter Fullscreen
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
          {isSubmitting ? 'Submitting...' : 'Submit Game'}
        </MenuItem>
      </Menu>
    </Box>
  );
};

function EditGame({ bookkeeper, localGameId }: EditGameProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: SnackbarSeverity }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const currentView = bookkeeper.getCurrentView();
  const currentGameState = bookkeeper.gameState();
  const isHalfRecorded = bookkeeper.pointsAtHalf > 0;

  const showSnackbar = (message: string, severity: SnackbarSeverity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleRecordHalf = async () => {
    if (isHalfRecorded) {
      showSnackbar('Half has already been recorded.', 'warning');
      return;
    }
    await bookkeeper.recordHalf();
    showSnackbar('Half time recorded.', 'success');
  };

  const handleSubmitGame = async () => {
    // Prevent multiple simultaneous submissions
    if (isSubmitting) {
      return;
    }

    // First, confirm the user wants to submit
    const confirmed = window.confirm(
      'Are you sure you want to submit this game? This action cannot be undone and the game will be uploaded to the server.'
    );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
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
    if (
      currentGameState === GameState.SelectingLines ||
      currentGameState === GameState.EditingLines
    ) {
      return;
    }

    // Always start editing lines mode (keeps current players for editing)
    // This works whether there's an active point or just selected players
    bookkeeper.startEditingLines();
  };

  const handleEditRosters = async () => {
    if (currentView === 'editRosters') {
      return;
    }

    bookkeeper.startEditingRosters();
  };

  const handleEnterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        showSnackbar('Entered fullscreen mode', 'success');
      } else {
        showSnackbar('Fullscreen not supported on this device', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to enter fullscreen', 'error');
      console.error('Fullscreen error:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopBar
        bookkeeper={bookkeeper}
        localGameId={localGameId}
        currentGameState={currentGameState}
        isHalfRecorded={isHalfRecorded}
        isSubmitting={isSubmitting}
        onRecordHalf={handleRecordHalf}
        onSubmitGame={handleSubmitGame}
        onChangeLine={handleChangeLine}
        onEditRosters={handleEditRosters}
        onEnterFullscreen={handleEnterFullscreen}
      />
      <MainContent bookkeeper={bookkeeper} currentView={currentView} />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function TopBar({
  bookkeeper,
  localGameId,
  currentGameState,
  isHalfRecorded,
  isSubmitting,
  onRecordHalf,
  onSubmitGame,
  onChangeLine,
  onEditRosters,
  onEnterFullscreen,
}: {
  bookkeeper: any;
  localGameId: string;
  currentGameState: GameState;
  isHalfRecorded: boolean;
  isSubmitting: boolean;
  onRecordHalf: () => Promise<void>;
  onSubmitGame: () => Promise<void>;
  onChangeLine: () => Promise<void>;
  onEditRosters: () => Promise<void>;
  onEnterFullscreen: () => Promise<void>;
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
            isSubmitting={isSubmitting}
            onRecordHalf={onRecordHalf}
            onSubmitGame={onSubmitGame}
            onChangeLine={onChangeLine}
            onEditRosters={onEditRosters}
            onEnterFullscreen={onEnterFullscreen}
          />
        </Box>
      </Toolbar>
      <Box sx={{ textAlign: 'center', pb: 1 }}>
        <Typography variant="h5" sx={{ fontSize: '1.5em', mb: 0.5 }}>
          {bookkeeper.getHomeTeamName()} vs {bookkeeper.getAwayTeamName()}
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
        overscrollBehavior: 'none',
      }}
    >
      {currentView === 'selectLines' && <SelectLines bookkeeper={bookkeeper} />}

      {currentView === 'recordStats' && <RecordStats bookkeeper={bookkeeper} />}

      {currentView === 'editRosters' && <EditRosters bookkeeper={bookkeeper} />}
    </Box>
  );
}

export default EditGame;
