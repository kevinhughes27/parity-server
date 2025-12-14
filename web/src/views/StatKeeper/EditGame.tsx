import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, AppBar, Toolbar } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Bookkeeper } from './bookkeeper';
import SelectLines from './SelectLines';
import RecordStats from './RecordStats';
import EditRosters from './EditRosters';
import ActionsMenu from './ActionsMenu';
import { useSnackbar } from './notifications';
import { useConfirmDialog } from './confirm';

interface EditGameProps {
  bookkeeper: Bookkeeper;
  localGameId: string;
}

function EditGame({ bookkeeper }: EditGameProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local UI state - NOT persisted
  // Start in roster editing mode if this is a brand new game (no points recorded)
  const isNewGame = bookkeeper.pointsCount === 0;
  const isNewPoint = bookkeeper.homePlayers === null || bookkeeper.awayPlayers === null;
  const [isEditingRosters, setIsEditingRosters] = useState(isNewGame);
  const [isChangingLines, setIsChangingLines] = useState(isNewPoint);

  const { showSnackbar, SnackbarComponent } = useSnackbar({ defaultSeverity: 'info' });
  const { confirm, DialogComponent } = useConfirmDialog();

  // Determine view
  const currentView = isEditingRosters
    ? 'editRosters'
    : isChangingLines
      ? 'selectLines'
      : isNewPoint
        ? 'selectLines'
        : 'recordStats';

  const handleRecordHalf = async () => {
    const isHalfRecorded = bookkeeper.pointsAtHalf > 0;

    if (isHalfRecorded) {
      showSnackbar('Half has already been recorded.', 'warning');
      return;
    }
    try {
      await bookkeeper.recordHalf();
      showSnackbar('Half time recorded.', 'success');
    } catch (error) {
      showSnackbar(error instanceof Error ? error.message : 'Failed to record half time.', 'error');
    }
  };

  const handleSubmitGame = async () => {
    // Prevent multiple simultaneous submissions
    if (isSubmitting) {
      return;
    }

    // Show confirmation dialog
    const confirmed = await confirm({
      title: 'Confirm Game Submission',
      message:
        'Are you sure you want to submit this game? This action cannot be undone and the game will be uploaded to the server.',
      confirmText: 'Submit',
    });

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    try {
      await bookkeeper.submitGame();
      showSnackbar('Game submitted and uploaded successfully!', 'success');
    } catch (error) {
      showSnackbar(
        `Game submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
      console.error('Submission error:', error);
    } finally {
      // Always redirect to StatKeeper home regardless of success or failure
      navigate('/stat_keeper');
    }
  };

  const handleChangeLine = () => {
    setIsChangingLines(true);
  };

  const handleEditRosters = () => {
    setIsEditingRosters(true);
  };

  const handleExitEditingRosters = () => {
    setIsEditingRosters(false);
  };

  const handleExitChangingLines = () => {
    setIsChangingLines(false);
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
        currentView={currentView}
        isSubmitting={isSubmitting}
        onRecordHalf={handleRecordHalf}
        onSubmitGame={handleSubmitGame}
        onChangeLine={handleChangeLine}
        onEditRosters={handleEditRosters}
        onEnterFullscreen={handleEnterFullscreen}
      />
      <MainContent
        bookkeeper={bookkeeper}
        currentView={currentView}
        onExitEditingRosters={handleExitEditingRosters}
        onExitChangingLines={handleExitChangingLines}
      />
      {DialogComponent}
      {SnackbarComponent}
    </Box>
  );
}

function TopBar({
  bookkeeper,
  currentView,
  isSubmitting,
  onRecordHalf,
  onSubmitGame,
  onChangeLine,
  onEditRosters,
  onEnterFullscreen,
}: {
  bookkeeper: Bookkeeper;
  currentView: string;
  isSubmitting: boolean;
  onRecordHalf: () => Promise<void>;
  onSubmitGame: () => Promise<void>;
  onChangeLine: () => void;
  onEditRosters: () => void;
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
            bookkeeper={bookkeeper}
            currentView={currentView}
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

function MainContent({
  bookkeeper,
  currentView,
  onExitEditingRosters,
  onExitChangingLines,
}: {
  bookkeeper: any;
  currentView: string;
  onExitEditingRosters: () => void;
  onExitChangingLines: () => void;
}) {
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
      {currentView === 'selectLines' && (
        <SelectLines bookkeeper={bookkeeper} onComplete={onExitChangingLines} />
      )}

      {currentView === 'recordStats' && <RecordStats bookkeeper={bookkeeper} />}

      {currentView === 'editRosters' && (
        <EditRosters bookkeeper={bookkeeper} onComplete={onExitEditingRosters} />
      )}
    </Box>
  );
}

export default EditGame;
