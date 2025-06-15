import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Box, Typography, AppBar, Toolbar } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useBookkeeper, useFullscreen } from './hooks';
import SelectLines from './SelectLines';
import RecordStats from './RecordStats';
import GameActionsMenu from './GameActionsMenu';

const ACTION_BAR_HEIGHT = '70px'; // Consistent height for the bottom action bar

function LocalGame() {
  const navigate = useNavigate();
  const { localGameId } = useParams<{ localGameId: string }>();
  const bookkeeper = useBookkeeper(localGameId!);

  useFullscreen();

  if (!bookkeeper) {
    return (
      <div style={{ padding: '20px', height: '100vh', boxSizing: 'border-box' }}>
        <p>Loading game data...</p>
      </div>
    );
  }

  // what is getError?
  if (bookkeeper.getError()) {
    return (
      <div style={{ padding: '20px', height: '100vh', boxSizing: 'border-box' }}>
        <p style={{ color: 'red' }}>Error: {bookkeeper.getError()}</p>
        <Link to="/stat_keeper" style={{ display: 'flex', alignItems: 'center' }}>
          <ArrowBackIcon fontSize="small" sx={{ mr: 0.5 }} /> Back to StatKeeper Home
        </Link>
      </div>
    );
  }

  const currentView = bookkeeper.getCurrentView();
  const isHalfRecorded = bookkeeper.pointsAtHalf > 0;

  const handleRecordHalf = async () => {
    // should pull this logic into bookkeeper as well)
    if (bookkeeper.pointsAtHalf > 0) {
      alert('Half has already been recorded.');
      return;
    }
    await bookkeeper.performAction(bk => bk.recordHalf());
    alert('Half time recorded.');
  };

  const handleSubmitGame = async () => {
    try {
      await bookkeeper.submitGame();
      alert('Game submitted and uploaded successfully!');
      navigate('/stat_keeper');
    } catch (error) {
      alert(
        `An error occurred during game submission: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.error('Submission error:', error);
    }
  };

  // this logic should all be in the bookkeeper really
  const handleChangeLine = async () => {
    // no-op if already selecting lines
    if (currentView == 'selectLines') {
      return;
    }

    // Preserve current line before clearing it
    const currentLine = {
      home: [...(bookkeeper.homePlayers || [])],
      away: [...(bookkeeper.awayPlayers || [])],
    };

    // Set the resuming mode and preserved line BEFORE clearing players
    bookkeeper.setIsResumingPointMode(true);
    bookkeeper.setLastPlayedLine(currentLine);

    // Force transition to selectLines view even with an active point
    await bookkeeper.performAction(
      bk => {
        // Clear the current line selection to allow re-selection
        bk.homePlayers = null;
        bk.awayPlayers = null;
      }
      // Don't skip view change - we want the view to update to selectLines
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top Bar with AppBar */}
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
              numericGameId={parseInt(localGameId!)}
              gameStatus={bookkeeper.getGameStatus()}
              isHalfRecorded={isHalfRecorded}
              onRecordHalf={handleRecordHalf}
              onSubmitGame={handleSubmitGame}
              onChangeLine={handleChangeLine}
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

      {/* Main Content Area (Scrollable) */}
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
      </Box>
      {/* The fixed action bar is now rendered by SelectLines/RecordStats */}
    </Box>
  );
}

export default LocalGame;
