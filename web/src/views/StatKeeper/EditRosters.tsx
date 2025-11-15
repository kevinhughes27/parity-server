import React, { useState, useEffect } from 'react';
import { Bookkeeper } from './bookkeeper';
import { useTeams } from './hooks';
import EditRoster from './EditRoster';
import { StoredPlayer } from './db';
import ActionBar from './ActionBar';
import { Box, Typography } from '@mui/material';

const EditRosters: React.FC<{ bookkeeper: Bookkeeper }> = ({ bookkeeper }) => {
  const {
    allLeaguePlayers, // Already sorted from useTeams
    loadingTeams: loadingLeaguePlayers,
    errorTeams: errorLeaguePlayers,
  } = useTeams(bookkeeper.league.id.toString());

  const [homeRoster, setHomeRoster] = useState<StoredPlayer[]>([]);
  const [awayRoster, setAwayRoster] = useState<StoredPlayer[]>([]);

  const sortAndSetHomeRoster = (roster: StoredPlayer[]) => {
    setHomeRoster([...roster].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const sortAndSetAwayRoster = (roster: StoredPlayer[]) => {
    setAwayRoster([...roster].sort((a, b) => a.name.localeCompare(b.name)));
  };

  useEffect(() => {
    if (bookkeeper) {
      // Convert current team players to StoredPlayer format
      const homeRosterPlayers = bookkeeper.homeTeam.players.map(p => ({
        name: p.name,
        is_open: p.is_open ?? true,
      }));
      const awayRosterPlayers = bookkeeper.awayTeam.players.map(p => ({
        name: p.name,
        is_open: p.is_open ?? true,
      }));

      sortAndSetHomeRoster(homeRosterPlayers);
      sortAndSetAwayRoster(awayRosterPlayers);
    } else {
      sortAndSetHomeRoster([]);
      sortAndSetAwayRoster([]);
    }
  }, [bookkeeper]);

  const handleUpdateRosters = async () => {
    if (homeRoster.length === 0 || awayRoster.length === 0) {
      alert('Rosters cannot be empty.');
      return;
    }

    try {
      // Update the team objects with new rosters including gender
      bookkeeper.homeTeam.players = homeRoster.map(player => ({
        name: player.name,
        team: bookkeeper.homeTeam.name,
        is_open: player.is_open,
      }));

      bookkeeper.awayTeam.players = awayRoster.map(player => ({
        name: player.name,
        team: bookkeeper.awayTeam.name,
        is_open: player.is_open,
      }));

      // Update the stored game rosters (the bookkeeper will handle the roster update)
      await bookkeeper.updateRosters(homeRoster, awayRoster);

      bookkeeper.cancelEditingRosters();

      console.log('Rosters updated successfully.');
    } catch (error) {
      console.error('Failed to update rosters:', error);
      alert(
        `Failed to update rosters: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleCancel = () => {
    // Reset to original rosters
    if (bookkeeper) {
      const homeRosterPlayers = bookkeeper.homeTeam.players.map(p => ({
        name: p.name,
        is_open: p.is_open ?? true,
      }));
      const awayRosterPlayers = bookkeeper.awayTeam.players.map(p => ({
        name: p.name,
        is_open: p.is_open ?? true,
      }));

      sortAndSetHomeRoster(homeRosterPlayers);
      sortAndSetAwayRoster(awayRosterPlayers);
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
              teamName={bookkeeper.homeTeam.name}
              allLeaguePlayers={allLeaguePlayers} // Already sorted from useTeams
              currentRoster={homeRoster} // Already sorted by sortAndSetHomeRoster
              onRosterChange={sortAndSetHomeRoster} // Pass the sorting setter
            />
          </Box>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <EditRoster
              teamName={bookkeeper.awayTeam.name}
              allLeaguePlayers={allLeaguePlayers} // Already sorted from useTeams
              currentRoster={awayRoster} // Already sorted by sortAndSetAwayRoster
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
    </Box>
  );
};

export default EditRosters;
