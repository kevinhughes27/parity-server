import React, { useState, useEffect } from 'react';
import { Bookkeeper, sortRosters } from './bookkeeper';
import { useTeams } from './hooks';
import EditRoster from './EditRoster';
import { StoredPlayer } from './db';
import ActionBar from './ActionBar';
import { Box, Typography } from '@mui/material';
import { useSnackbar } from './notifications';

const EditRosters: React.FC<{ bookkeeper: Bookkeeper }> = ({ bookkeeper }) => {
  const {
    allLeaguePlayers, // Already sorted from useTeams
    loadingTeams: loadingLeaguePlayers,
    errorTeams: errorLeaguePlayers,
  } = useTeams(bookkeeper.league.id.toString());

  const [homeRoster, setHomeRoster] = useState<StoredPlayer[]>([]);
  const [awayRoster, setAwayRoster] = useState<StoredPlayer[]>([]);
  const [originalHomeRoster, setOriginalHomeRoster] = useState<StoredPlayer[]>([]);
  const [originalAwayRoster, setOriginalAwayRoster] = useState<StoredPlayer[]>([]);

  const { showSnackbar, SnackbarComponent } = useSnackbar();

  const sortAndSetHomeRoster = (roster: StoredPlayer[]) => {
    setHomeRoster(sortRosters(roster));
  };

  const sortAndSetAwayRoster = (roster: StoredPlayer[]) => {
    setAwayRoster(sortRosters(roster));
  };

  useEffect(() => {
    if (bookkeeper) {
      const homeRosterFromBookkeeper = bookkeeper.getHomeRoster();
      const awayRosterFromBookkeeper = bookkeeper.getAwayRoster();
      sortAndSetHomeRoster(homeRosterFromBookkeeper);
      sortAndSetAwayRoster(awayRosterFromBookkeeper);
      setOriginalHomeRoster(homeRosterFromBookkeeper);
      setOriginalAwayRoster(awayRosterFromBookkeeper);
    } else {
      sortAndSetHomeRoster([]);
      sortAndSetAwayRoster([]);
      setOriginalHomeRoster([]);
      setOriginalAwayRoster([]);
    }
  }, [bookkeeper]);

  const handleUpdateRosters = async () => {
    if (homeRoster.length === 0 || awayRoster.length === 0) {
      showSnackbar('Rosters cannot be empty.');
      return;
    }

    try {
      // Update the stored game rosters
      await bookkeeper.updateRosters(homeRoster, awayRoster);

      bookkeeper.cancelEditingRosters();

      console.log('Rosters updated successfully.');
    } catch (error) {
      console.error('Failed to update rosters:', error);
      showSnackbar(
        `Failed to update rosters: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  };

  const handleCancel = () => {
    // Reset to original rosters
    if (bookkeeper) {
      sortAndSetHomeRoster(bookkeeper.getHomeRoster());
      sortAndSetAwayRoster(bookkeeper.getAwayRoster());
    }
    bookkeeper.cancelEditingRosters();
  };

  if (loadingLeaguePlayers) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1.25 }}>
        <Typography sx={{ textAlign: 'center', mt: 4 }}>Loading league player data...</Typography>
      </Box>
    );
  }

  if (errorLeaguePlayers) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1.25 }}>
        <Typography sx={{ color: 'error.main', textAlign: 'center', mt: 4 }}>
          Error loading league players: {errorLeaguePlayers}
        </Typography>
        <ActionBar
          primaryActions={[]}
          secondaryActions={[
            {
              label: 'Back',
              onClick: handleCancel,
              color: 'primary',
              variant: 'outlined',
            },
          ]}
        />
      </Box>
    );
  }

  if (allLeaguePlayers.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1.25 }}>
        <Typography sx={{ textAlign: 'center', mt: 4 }}>
          No players found for the league: {bookkeeper.league.name}.
        </Typography>
        <ActionBar
          primaryActions={[]}
          secondaryActions={[
            {
              label: 'Back',
              onClick: handleCancel,
              color: 'primary',
              variant: 'outlined',
            },
          ]}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1.25 }}>
      <Box sx={{ flexGrow: 1, overflow: 'hidden', mb: 1.25 }}>
        <Box sx={{ display: 'flex', height: '100%', gap: 1.25 }}>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <EditRoster
              teamName={bookkeeper.getHomeTeamName()}
              allLeaguePlayers={allLeaguePlayers} // Already sorted from useTeams
              currentRoster={homeRoster} // Already sorted by sortAndSetHomeRoster
              originalRoster={originalHomeRoster} // Original roster for reference
              onRosterChange={sortAndSetHomeRoster} // Pass the sorting setter
            />
          </Box>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <EditRoster
              teamName={bookkeeper.getAwayTeamName()}
              allLeaguePlayers={allLeaguePlayers} // Already sorted from useTeams
              currentRoster={awayRoster} // Already sorted by sortAndSetAwayRoster
              originalRoster={originalAwayRoster} // Original roster for reference
              onRosterChange={sortAndSetAwayRoster} // Pass the sorting setter
            />
          </Box>
        </Box>
      </Box>

      <ActionBar
        primaryActions={[
          {
            label: 'Update Rosters',
            onClick: handleUpdateRosters,
            disabled: homeRoster.length === 0 || awayRoster.length === 0,
            color: 'success',
            variant: 'contained',
          },
        ]}
        secondaryActions={[
          {
            label: 'Cancel',
            onClick: handleCancel,
            color: 'primary',
            variant: 'outlined',
          },
        ]}
      />

      {SnackbarComponent}
    </Box>
  );
};

export default EditRosters;
