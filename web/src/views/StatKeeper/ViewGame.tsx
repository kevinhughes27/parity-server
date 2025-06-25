import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ReactJson from 'react-json-view';
import { Bookkeeper } from './bookkeeper';
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import SyncIcon from '@mui/icons-material/Sync';

function TopBar({
  bookkeeper,
  isResyncing,
  canResync,
  onDownloadJson,
  onResync,
}: {
  bookkeeper: Bookkeeper;
  isResyncing: boolean;
  canResync: boolean;
  onDownloadJson: () => void;
  onResync: () => void;
}) {
  const apiPayload = bookkeeper.transformForAPI();
  const gameStatus = bookkeeper.getGameStatus();

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

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={onDownloadJson}
            size="small"
          >
            Download JSON
          </Button>

          {canResync && (
            <Button
              variant="contained"
              startIcon={isResyncing ? <CircularProgress size={16} /> : <SyncIcon />}
              onClick={onResync}
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
          <strong> Week:</strong> {apiPayload.week} |<strong> Status:</strong> {gameStatus}
        </Typography>
      </Box>
    </AppBar>
  );
}

function GameDataViewer({ apiPayload }: { apiPayload: any }) {
  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <ReactJson
        src={apiPayload}
        theme="rjv-default"
        collapsed={false}
        displayDataTypes={false}
        displayObjectSize={false}
        enableClipboard={true}
        indentWidth={2}
        name={false}
        style={{
          backgroundColor: '#f5f5f5',
          padding: '12px',
          borderRadius: '4px',
          fontSize: '13px',
        }}
      />
    </Paper>
  );
}

interface ViewGameProps {
  bookkeeper: Bookkeeper;
}

function ViewGame({ bookkeeper }: ViewGameProps) {
  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncMessage, setResyncMessage] = useState<string | null>(null);

  const handleDownloadJson = () => {
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
    setIsResyncing(true);
    setResyncMessage(null);

    try {
      await bookkeeper.submitGame();
      setResyncMessage('Game successfully uploaded to server!');
    } catch (error) {
      setResyncMessage(
        `Re-sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsResyncing(false);
    }
  };

  const gameStatus = bookkeeper.getGameStatus();
  const canResync = gameStatus === 'sync-error';
  const apiPayload = bookkeeper.transformForAPI();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopBar
        bookkeeper={bookkeeper}
        isResyncing={isResyncing}
        canResync={canResync}
        onDownloadJson={handleDownloadJson}
        onResync={handleResync}
      />

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

        <GameDataViewer apiPayload={apiPayload} />
      </Box>
    </Box>
  );
}

export default ViewGame;
