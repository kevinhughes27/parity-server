import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, StoredGame } from './db';
import { leagues as apiLeagues } from '../../api'; // Renamed import
import { useTeams } from './hooks';
import { BookkeeperVolatileState, SerializedMemento } from './models';
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import EditRoster from './EditRoster';

const ACTION_BAR_HEIGHT = '70px'; // Consistent height for the bottom action bar

// Removed placeholderRosterStyle as it's now defined inline with MUI sx prop

function NewGame() {
  const navigate = useNavigate();

  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(apiLeagues[0]?.id || '');

  const { leagueTeams, allLeaguePlayers, loadingTeams, errorTeams } = useTeams(selectedLeagueId);

  const [homeTeamIdStr, setHomeTeamIdStr] = useState<string>('');
  const [awayTeamIdStr, setAwayTeamIdStr] = useState<string>('');
  const [week, setWeek] = useState<number>(1);
  const [homeRosterNames, setHomeRosterNames] = useState<string[]>([]);
  const [awayRosterNames, setAwayRosterNames] = useState<string[]>([]);

  const sortAndSetHomeRoster = (roster: string[]) => {
    setHomeRosterNames([...roster].sort((a, b) => a.localeCompare(b)));
  };

  const sortAndSetAwayRoster = (roster: string[]) => {
    setAwayRosterNames([...roster].sort((a, b) => a.localeCompare(b)));
  };

  useEffect(() => {
    setHomeTeamIdStr('');
    setAwayTeamIdStr('');
    sortAndSetHomeRoster([]);
    sortAndSetAwayRoster([]);
  }, [selectedLeagueId]);

  const selectedHomeTeamObj = leagueTeams.find(t => t.id.toString() === homeTeamIdStr);
  const selectedAwayTeamObj = leagueTeams.find(t => t.id.toString() === awayTeamIdStr);

  useEffect(() => {
    sortAndSetHomeRoster(selectedHomeTeamObj ? selectedHomeTeamObj.players.map(p => p.name) : []);
  }, [selectedHomeTeamObj]);

  useEffect(() => {
    sortAndSetAwayRoster(selectedAwayTeamObj ? selectedAwayTeamObj.players.map(p => p.name) : []);
  }, [selectedAwayTeamObj]);

  const handleCreateGame = async () => {
    if (
      !selectedLeagueId ||
      !selectedHomeTeamObj ||
      !selectedAwayTeamObj ||
      homeRosterNames.length === 0 ||
      awayRosterNames.length === 0
    ) {
      alert('Please select a league, both teams, and ensure rosters are not empty.');
      return;
    }

    const initialBookkeeperState: BookkeeperVolatileState = {
      activePoint: null,
      firstActor: null,
      homePossession: true,
      pointsAtHalf: 0,
      homePlayers: null,
      awayPlayers: null,
      homeScore: 0,
      awayScore: 0,
      homeParticipants: [...homeRosterNames].sort((a, b) => a.localeCompare(b)), // Ensure sorted on save
      awayParticipants: [...awayRosterNames].sort((a, b) => a.localeCompare(b)), // Ensure sorted on save
    };

    const initialMementos: SerializedMemento[] = [];

    const newGameData: Omit<StoredGame, 'localId'> = {
      serverId: undefined,
      league_id: selectedLeagueId,
      week: week,
      homeTeam: selectedHomeTeamObj.name,
      homeTeamId: selectedHomeTeamObj.id,
      homeScore: 0,
      homeRoster: [...homeRosterNames].sort((a, b) => a.localeCompare(b)), // Ensure sorted on save
      awayTeam: selectedAwayTeamObj.name,
      awayTeamId: selectedAwayTeamObj.id,
      awayScore: 0,
      awayRoster: [...awayRosterNames].sort((a, b) => a.localeCompare(b)), // Ensure sorted on save
      points: [],
      status: 'new',
      lastModified: new Date(),
      bookkeeperState: initialBookkeeperState,
      mementos: initialMementos,
    };

    try {
      const id = await db.games.add(newGameData as StoredGame);
      console.log(`New game added with localId: ${id}`);
      navigate(`/stat_keeper/game/${id}`);
    } catch (error) {
      console.error('Failed to create new game:', error);
      alert(`Failed to create game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const availableAwayTeams = leagueTeams.filter(t => t.id.toString() !== homeTeamIdStr);
  const availableHomeTeams = leagueTeams.filter(t => t.id.toString() !== awayTeamIdStr);

  const pageTitle = 'Create New Game';
  const buttonText = 'Start';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top Bar with AppBar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Link
            to={'/stat_keeper'}
            style={{ fontSize: '0.9em', textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}
          >
            <ArrowBackIcon fontSize="small" sx={{ mr: 0.5 }} /> Back to StatKeeper Home
          </Link>
        </Toolbar>
        <Box sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="h5" sx={{ fontSize: '1.5em' }}>
            {pageTitle}
          </Typography>
        </Box>
      </AppBar>

      {/* Main Content Area */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          p: 2,
          pb: `calc(${ACTION_BAR_HEIGHT} + 16px)`,
        }}
      >
        {/* Section 1: League and Week Selectors */}
        <Paper elevation={1} sx={{ p: 2, mb: 2, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="league-select-label">League</InputLabel>
              <Select
                labelId="league-select-label"
                id="league-select"
                value={selectedLeagueId}
                onChange={e => setSelectedLeagueId(e.target.value)}
                label="League"
              >
                {apiLeagues.map(l => (
                  <MenuItem key={l.id} value={l.id}>
                    {l.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              id="week-select"
              label="Week"
              type="number"
              value={week}
              onChange={e => setWeek(parseInt(e.target.value, 10) || 1)}
              inputProps={{ min: 1 }}
              sx={{ width: '120px' }}
            />
          </Box>
        </Paper>

        {/* Loading/Error Messages */}
        {loadingTeams && (
          <Typography sx={{ flexShrink: 0, p: 2 }}>Loading teams...</Typography>
        )}
        {errorTeams && (
          <Typography sx={{ color: 'error.main', flexShrink: 0, p: 2 }}>
            Error: {errorTeams}
          </Typography>
        )}

        {/* Section 2: Team Selectors and Roster Editors */}
        {!loadingTeams && !errorTeams && leagueTeams.length > 0 && (
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Team Selection Dropdowns */}
            <Paper elevation={1} sx={{ p: 2, mb: 2, flexShrink: 0 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="home-team-select-label">Home Team</InputLabel>
                  <Select
                    labelId="home-team-select-label"
                    id="home-team-select"
                    value={homeTeamIdStr}
                    onChange={e => setHomeTeamIdStr(e.target.value)}
                    label="Home Team"
                    disabled={availableHomeTeams.length === 0 && !homeTeamIdStr}
                  >
                    <MenuItem value="">Select Home Team</MenuItem>
                    {availableHomeTeams.map(team => (
                      <MenuItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </MenuItem>
                    ))}
                    {homeTeamIdStr &&
                      !availableHomeTeams.find(t => t.id.toString() === homeTeamIdStr) &&
                      selectedHomeTeamObj && (
                        <MenuItem
                          key={selectedHomeTeamObj.id}
                          value={selectedHomeTeamObj.id.toString()}
                        >
                          {selectedHomeTeamObj.name}
                        </MenuItem>
                      )}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel id="away-team-select-label">Away Team</InputLabel>
                  <Select
                    labelId="away-team-select-label"
                    id="away-team-select"
                    value={awayTeamIdStr}
                    onChange={e => setAwayTeamIdStr(e.target.value)}
                    label="Away Team"
                    disabled={availableAwayTeams.length === 0 && !awayTeamIdStr}
                  >
                    <MenuItem value="">Select Away Team</MenuItem>
                    {availableAwayTeams.map(team => (
                      <MenuItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </MenuItem>
                    ))}
                    {awayTeamIdStr &&
                      !availableAwayTeams.find(t => t.id.toString() === awayTeamIdStr) &&
                      selectedAwayTeamObj && (
                        <MenuItem
                          key={selectedAwayTeamObj.id}
                          value={selectedAwayTeamObj.id.toString()}
                        >
                          {selectedAwayTeamObj.name}
                        </MenuItem>
                      )}
                  </Select>
                </FormControl>
              </Box>
            </Paper>

            {/* Roster Editing Columns */}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                flexGrow: 1,
                overflow: 'hidden',
              }}
            >
              {/* Home Roster Column */}
              <Box
                sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                {selectedHomeTeamObj ? (
                  <EditRoster
                    teamName={selectedHomeTeamObj.name}
                    allLeaguePlayers={allLeaguePlayers} // Already sorted from useTeams
                    currentRosterNames={homeRosterNames} // Already sorted by sortAndSetHomeRoster
                    onRosterChange={sortAndSetHomeRoster} // Pass the sorting setter
                  />
                ) : (
                  <Paper
                    elevation={1}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#f9f9f9',
                      borderRadius: 1,
                      border: '1px dashed #ccc'
                    }}
                  >
                    <Typography color="text.secondary">
                      Select Home Team to edit roster.
                    </Typography>
                  </Paper>
                )}
              </Box>

              {/* Away Roster Column */}
              <Box
                sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                {selectedAwayTeamObj ? (
                  <EditRoster
                    teamName={selectedAwayTeamObj.name}
                    allLeaguePlayers={allLeaguePlayers} // Already sorted from useTeams
                    currentRosterNames={awayRosterNames} // Already sorted by sortAndSetAwayRoster
                    onRosterChange={sortAndSetAwayRoster} // Pass the sorting setter
                  />
                ) : (
                  <Paper
                    elevation={1}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#f9f9f9',
                      borderRadius: 1,
                      border: '1px dashed #ccc'
                    }}
                  >
                    <Typography color="text.secondary">
                      Select Away Team to edit roster.
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* Message if no teams found */}
        {leagueTeams.length === 0 && !loadingTeams && selectedLeagueId && !errorTeams && (
          <Typography sx={{ flexShrink: 0, p: 2 }}>
            No teams found for the selected league.
          </Typography>
        )}
      </Box>

      {/* Fixed Bottom Action Bar */}
      {!loadingTeams &&
        !errorTeams &&
        leagueTeams.length > 0 &&
        selectedHomeTeamObj &&
        selectedAwayTeamObj && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: ACTION_BAR_HEIGHT,
              p: '10px 15px',
              backgroundColor: 'white',
              borderTop: '1px solid #ccc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              zIndex: 100,
            }}
          >
            <Button
              onClick={handleCreateGame}
              variant="contained"
              color="success"
              disabled={homeRosterNames.length === 0 || awayRosterNames.length === 0}
              sx={{ fontSize: '1em', px: 3 }}
            >
              {buttonText}
            </Button>
          </Box>
        )}
    </Box>
  );
}

export default NewGame;
