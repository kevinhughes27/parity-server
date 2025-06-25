import React, { useState, useEffect } from 'react';
import { Bookkeeper } from './bookkeeper';
import { useTeams } from './hooks';
import EditRoster from './EditRoster';
import ActionBar from './ActionBar';
import { Box, Typography } from '@mui/material';

interface EditRostersProps {
  bookkeeper: Bookkeeper;
}

const EditRosters: React.FC<EditRostersProps> = ({ bookkeeper }) => {
  const {
    allLeaguePlayers, // Already sorted from useTeams
    loadingTeams: loadingLeaguePlayers,
    errorTeams: errorLeaguePlayers,
  } = useTeams(bookkeeper.league.id.toString());

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
    if (homeRosterNames.length === 0 || awayRosterNames.length === 0) {
      alert('Rosters cannot be empty.');
      return;
    }

    try {
      // Update the team objects with new rosters
      bookkeeper.homeTeam.players = homeRosterNames.map(name => ({
        name,
        team: bookkeeper.homeTeam.name,
        is_male: true // Default, will be updated when proper team data is loaded
      }));

      bookkeeper.awayTeam.players = awayRosterNames.map(name => ({
        name,
        team: bookkeeper.awayTeam.name,
        is_male: true // Default, will be updated when proper team data is loaded
      }));

      // Update the stored game rosters
      await bookkeeper.updateRosters(homeRosterNames, awayRosterNames);

      // Return to the previous view (likely selectLines or recordStats)
      bookkeeper.currentView = bookkeeper.homePlayers ? 'recordStats' : 'selectLines';

      console.log('Rosters updated successfully.');
    } catch (error) {
      console.error('Failed to update rosters:', error);
      alert(
        `Failed to update rosters: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleCancel = () => {
    // Reset to original rosters and return to previous view
    sortAndSetHomeRoster(bookkeeper.getHomeRoster());
    sortAndSetAwayRoster(bookkeeper.getAwayRoster());
    bookkeeper.currentView = bookkeeper.homePlayers ? 'recordStats' : 'selectLines';
  };

  if (loadingLeaguePlayers) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1.25 }}>
        <Typography sx={{ textAlign: 'center', mt: 4 }}>
          Loading league player data...
        </Typography>
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
        </Box>
      </Box>

      <ActionBar
        primaryActions={[
          {
            label: 'Update Rosters',
            onClick: handleUpdateRosters,
            disabled: homeRosterNames.length === 0 || awayRosterNames.length === 0,
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
    </Box>
  );
};

export default EditRosters;
