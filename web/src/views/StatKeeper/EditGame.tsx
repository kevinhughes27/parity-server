import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import EditRoster from './EditRoster';
import { useBookkeeper, useTeams, useFullscreen } from './hooks';
import ActionBar from './ActionBar';
import { AppBar, Toolbar, Box, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const ACTION_BAR_HEIGHT = '70px'; // Consistent height for the bottom action bar

function EditGame() {
  const { localGameId } = useParams<{ localGameId: string }>();
  const navigate = useNavigate();
  const bookkeeper = useBookkeeper(localGameId!);
  useFullscreen();

  const {
    allLeaguePlayers, // Already sorted from useTeams
    loadingTeams: loadingLeaguePlayers,
    errorTeams: errorLeaguePlayers,
  } = useTeams(bookkeeper?.league.id.toString());

  const [homeRosterNames, setHomeRosterNames] = useState<string[]>([]);
  const [awayRosterNames, setAwayRosterNames] = useState<string[]>([]);

  const sortAndSetHomeRoster = (roster: string[]) => {
    setHomeRosterNames([...roster].sort((a, b) => a.localeCompare(b)));
  };

  const sortAndSetAwayRoster = (roster: string[]) => {
    setAwayRosterNames([...roster].sort((a, b) => a.localeCompare(b)));
  };

  useEffect(() => {
    if (bookkeeper) {
      sortAndSetHomeRoster(bookkeeper.getHomeRoster());
      sortAndSetAwayRoster(bookkeeper.getAwayRoster());
    } else {
      sortAndSetHomeRoster([]);
      sortAndSetAwayRoster([]);
    }
  }, [bookkeeper]);

  const handleUpdateRosters = async () => {
    if (!bookkeeper) {
      alert('Game data is not loaded correctly.');
      return;
    }
    if (homeRosterNames.length === 0 || awayRosterNames.length === 0) {
      alert('Rosters cannot be empty.');
      return;
    }

    try {
      // Update the bookkeeper's rosters and save
      await bookkeeper.performAction(
        bk => {
          bk.updateRosters(homeRosterNames, awayRosterNames);
        },
        { skipViewChange: true }
      );

      console.log(`Rosters for game updated successfully.`);
      navigate(`/stat_keeper/game/${localGameId}`);
    } catch (error) {
      console.error('Failed to update rosters:', error);
      alert(
        `Failed to update rosters: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  if (!bookkeeper) {
    return (
      <div style={{ padding: '20px', height: '100vh', boxSizing: 'border-box' }}>
        <p>Loading game details...</p>
      </div>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top Bar with AppBar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Link
            to={`/stat_keeper/game/${localGameId}`}
            style={{
              fontSize: '0.9em',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ArrowBackIcon fontSize="small" sx={{ mr: 0.5 }} /> Back to Game
          </Link>
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

      {/* Main Content Area (Scrollable Roster Columns) */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          overflow: 'hidden',
          p: 1.25,
          pb: `calc(${ACTION_BAR_HEIGHT} + 8px)`,
          gap: 1.25,
        }}
      >
        {loadingLeaguePlayers && (
          <Typography sx={{ flex: 1, textAlign: 'center' }}>
            Loading league player data...
          </Typography>
        )}
        {errorLeaguePlayers && (
          <Typography sx={{ color: 'error.main', flex: 1, textAlign: 'center' }}>
            Error loading league players: {errorLeaguePlayers}
          </Typography>
        )}

        {!loadingLeaguePlayers && !errorLeaguePlayers && allLeaguePlayers.length > 0 && (
          <>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <EditRoster
                teamName={bookkeeper.homeTeam.name}
                allLeaguePlayers={allLeaguePlayers} // Already sorted from useTeams
                currentRosterNames={homeRosterNames} // Already sorted by sortAndSetHomeRoster
                onRosterChange={sortAndSetHomeRoster} // Pass the sorting setter
              />
            </Box>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <EditRoster
                teamName={bookkeeper.awayTeam.name}
                allLeaguePlayers={allLeaguePlayers} // Already sorted from useTeams
                currentRosterNames={awayRosterNames} // Already sorted by sortAndSetAwayRoster
                onRosterChange={sortAndSetAwayRoster} // Pass the sorting setter
              />
            </Box>
          </>
        )}
        {!loadingLeaguePlayers &&
          !errorLeaguePlayers &&
          allLeaguePlayers.length === 0 &&
          bookkeeper?.league.id && (
            <Typography sx={{ flex: 1, textAlign: 'center' }}>
              No players found for the league: {bookkeeper.league.name}.
            </Typography>
          )}
      </Box>

      {/* Fixed Bottom Action Bar */}
      {!loadingLeaguePlayers && !errorLeaguePlayers && allLeaguePlayers.length > 0 && (
        <ActionBar
          actionBarHeight={ACTION_BAR_HEIGHT}
          primaryActions={[
            {
              label: 'Update Rosters',
              onClick: handleUpdateRosters,
              disabled: homeRosterNames.length === 0 || awayRosterNames.length === 0,
              color: 'primary',
              variant: 'contained',
            },
          ]}
          secondaryActions={[]}
        />
      )}
    </Box>
  );
}

export default EditGame;
