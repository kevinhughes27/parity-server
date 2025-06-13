import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useBookkeeper, useFullscreen } from './hooks';
import JsonViewer from './JsonViewer';
import { 
  AppBar, 
  Toolbar, 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import SyncIcon from '@mui/icons-material/Sync';

function ViewGame() {
  const { localGameId } = useParams<{ localGameId: string }>();
  const navigate = useNavigate();
  const bookkeeper = useBookkeeper(localGameId!);
  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncMessage, setResyncMessage] = useState<string | null>(null);
  
  useFullscreen();

  const handleDownloadJson = () => {
    if (!bookkeeper) return;

    const apiPayload = bookkeeper.transformForAPI();
    const jsonString = JSON.stringify(apiPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `game_${bookkeeper.homeTeam.name}_vs_${bookkeeper.awayTeam.name}_week${bookkeeper.week}_${timestamp}.json`;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleResync = async () => {
    if (!bookkeeper) return;

    setIsResyncing(true);
    setResyncMessage(null);

    try {
      await bookkeeper.submitGame();
      setResyncMessage('Game successfully uploaded to server!');
    } catch (error) {
      setResyncMessage(`Re-sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsResyncing(false);
    }
  };

  if (!bookkeeper) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading game data...</Typography>
      </Box>
    );
  }

  if (bookkeeper.getError()) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: {bookkeeper.getError()}
        </Alert>
        <Link to="/stat_keeper" style={{ display: 'flex', alignItems: 'center' }}>
          <ArrowBackIcon fontSize="small" sx={{ mr: 0.5 }} /> Back to StatKeeper Home
        </Link>
      </Box>
    );
  }

  const gameStatus = bookkeeper.getGameStatus();
  const canResync = gameStatus === 'sync-error';
  const apiPayload = bookkeeper.transformForAPI();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top Bar */}
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
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadJson}
              size="small"
            >
              Download JSON
            </Button>
            
            {canResync && (
              <Button
                variant="contained"
                startIcon={isResyncing ? <CircularProgress size={16} /> : <SyncIcon />}
                onClick={handleResync}
                disabled={isResyncing}
                size="small"
                color="warning"
              >
                {isResyncing ? 'Syncing...' : 'Re-sync'}
              </Button>
            )}
          </Box>
        </Toolbar>
        
        <Box sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="h5" sx={{ fontSize: '1.5em', mb: 0.5 }}>
            {bookkeeper.homeTeam.name} vs {bookkeeper.awayTeam.name}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.9em' }}>
            <strong>Score:</strong> {apiPayload.homeScore} - {apiPayload.awayScore} | 
            <strong> Week:</strong> {apiPayload.week} | 
            <strong> Status:</strong> {gameStatus}
          </Typography>
        </Box>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {resyncMessage && (
          <Alert 
            severity={resyncMessage.includes('successfully') ? 'success' : 'error'} 
            sx={{ mb: 2 }}
            onClose={() => setResyncMessage(null)}
          >
            {resyncMessage}
          </Alert>
        )}

        {/* API Payload Overview */}
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Game Summary</Typography>
          <JsonViewer data={{
            league_id: apiPayload.league_id,
            week: apiPayload.week,
            homeTeam: apiPayload.homeTeam,
            awayTeam: apiPayload.awayTeam,
            homeScore: apiPayload.homeScore,
            awayScore: apiPayload.awayScore,
            totalPoints: apiPayload.points.length,
            homeRosterSize: apiPayload.homeRoster.length,
            awayRosterSize: apiPayload.awayRoster.length,
          }} defaultExpanded={true} />
        </Paper>

        {/* Game Points */}
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Points ({apiPayload.points.length} total)
          </Typography>
          <JsonViewer data={apiPayload.points} name="points" defaultExpanded={true} />
        </Paper>

        {/* Team Rosters */}
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Team Rosters</Typography>
          <JsonViewer data={{
            homeRoster: apiPayload.homeRoster,
            awayRoster: apiPayload.awayRoster,
          }} defaultExpanded={false} />
        </Paper>

        <Divider sx={{ my: 2 }} />

        {/* Complete API Payload */}
        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Complete API Payload</Typography>
          <JsonViewer data={apiPayload} name="apiPayload" defaultExpanded={false} />
        </Paper>
      </Box>
    </Box>
  );
}

export default ViewGame;
