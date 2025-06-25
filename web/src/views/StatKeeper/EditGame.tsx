import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, AppBar, Toolbar } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Bookkeeper } from './bookkeeper';
import SelectLines from './SelectLines';
import RecordStats from './RecordStats';
import EditRosters from './EditRosters';
import GameActionsMenu from './GameActionsMenu';

const ACTION_BAR_HEIGHT = '70px'; // Consistent height for the bottom action bar

interface EditGameProps {
  bookkeeper: Bookkeeper;
  localGameId: string;
}

function EditGame({ bookkeeper, localGameId }: EditGameProps) {
  const navigate = useNavigate();
  const currentView = bookkeeper.getCurrentView();
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
      alert(
        `Game submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.error('Submission error:', error);
    } finally {
      // Always redirect to StatKeeper home regardless of success or failure
      navigate('/stat_keeper');
    }
  };

  const handleChangeLine = async () => {
    if (currentView === 'selectLines') {
      return;
    }

    // Force transition to line selection view
    bookkeeper.currentView = 'selectLines';
  };

  const handleEditRosters = async () => {
    if (currentView === 'editRosters') {
      return;
    }

    // Force transition to edit rosters view
    bookkeeper.currentView = 'editRosters';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopBar
        bookkeeper={bookkeeper}
        localGameId={localGameId}
        isHalfRecorded={isHalfRecorded}
        onRecordHalf={handleRecordHalf}
        onSubmitGame={handleSubmitGame}
        onChangeLine={handleChangeLine}
        onEditRosters={handleEditRosters}
      />
      <MainContent
        bookkeeper={bookkeeper}
        currentView={currentView}
      />
    </Box>
  );
}

function TopBar({
  bookkeeper,
  localGameId,
  isHalfRecorded,
  onRecordHalf,
  onSubmitGame,
  onChangeLine,
  onEditRosters
}: {
  bookkeeper: any;
  localGameId: string;
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
          <GameActionsMenu
            numericGameId={parseInt(localGameId)}
            gameStatus={bookkeeper.getGameStatus()}
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
        pb: `calc(${ACTION_BAR_HEIGHT} + 8px)`,
        position: 'relative',
      }}
    >
      {currentView === 'selectLines' && (
        <SelectLines bookkeeper={bookkeeper} actionBarHeight={ACTION_BAR_HEIGHT} />
      )}

      {currentView === 'recordStats' && (
        <RecordStats bookkeeper={bookkeeper} actionBarHeight={ACTION_BAR_HEIGHT} />
      )}

      {currentView === 'editRosters' && (
        <EditRosters bookkeeper={bookkeeper} actionBarHeight={ACTION_BAR_HEIGHT} />
      )}
    </Box>
  );
}

export default EditGame;
