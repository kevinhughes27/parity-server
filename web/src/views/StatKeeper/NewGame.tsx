import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTeams, useFullscreen, useSchedule } from './hooks';
import { Bookkeeper } from './bookkeeper';
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
  Paper,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Matchup } from '../../api';
import { homeColors, awayColors } from '../../helpers';

interface CurrentLeague {
  league: {
    id: number;
    zuluru_id: number;
    name: string;
    lineSize: number;
  };
}

interface TeamPickerProps {
  label: string;
  teamIdStr: string;
  setTeamIdStr: (id: string) => void;
  availableTeams: any[];
  selectedTeamObj: any;
  disabled: boolean;
}

const TeamPicker: React.FC<TeamPickerProps> = ({
  label,
  teamIdStr,
  setTeamIdStr,
  availableTeams,
  selectedTeamObj,
  disabled,
}) => {
  return (
    <FormControl fullWidth>
      <InputLabel id={`${label.toLowerCase()}-team-select-label`}>{label} Team</InputLabel>
      <Select
        labelId={`${label.toLowerCase()}-team-select-label`}
        id={`${label.toLowerCase()}-team-select`}
        value={teamIdStr}
        onChange={e => setTeamIdStr(e.target.value)}
        label={`${label} Team`}
        disabled={disabled}
      >
        <MenuItem value="">Select {label} Team</MenuItem>
        {availableTeams.map(team => (
          <MenuItem key={team.id} value={team.id.toString()}>
            {team.name}
          </MenuItem>
        ))}
        {teamIdStr &&
          !availableTeams.find(t => t.id.toString() === teamIdStr) &&
          selectedTeamObj && (
            <MenuItem key={selectedTeamObj.id} value={selectedTeamObj.id.toString()}>
              {selectedTeamObj.name}
            </MenuItem>
          )}
      </Select>
    </FormControl>
  );
};

const UpcomingMatchups: React.FC<{
  matchups: Matchup[];
  teams: any[];
  onSelectMatchup: (matchup: Matchup) => void;
  selectedMatchupId: number | null;
}> = ({ matchups, teams, onSelectMatchup, selectedMatchupId }) => {
  const getTeamName = (teamId: number) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || `Team ${teamId}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (matchups.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No upcoming games scheduled. Use manual selection below.
      </Alert>
    );
  }

  const sortedMatchups = [...matchups].sort(
    (a, b) => new Date(a.gameStart).getTime() - new Date(b.gameStart).getTime()
  );

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Upcoming Games
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {sortedMatchups.map(matchup => (
          <Box
            key={matchup.id}
            onClick={() => onSelectMatchup(matchup)}
            sx={{
              p: 2,
              border:
                selectedMatchupId === matchup.id
                  ? `2px solid ${homeColors[8]}`
                  : '1px solid #e0e0e0',
              borderRadius: 1,
              bgcolor: selectedMatchupId === matchup.id ? '#f0f7ff' : 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: selectedMatchupId === matchup.id ? '#f0f7ff' : '#f9f9f9',
                borderColor: selectedMatchupId === matchup.id ? homeColors[8] : '#999',
              },
            }}
          >
            <Typography variant="body1">
              <span style={{ color: homeColors[8], fontWeight: 'bold' }}>
                {getTeamName(matchup.homeTeamId)}
              </span>
              {' vs '}
              <span style={{ color: awayColors[8], fontWeight: 'bold' }}>
                {getTeamName(matchup.awayTeamId)}
              </span>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Week {matchup.week} • {formatDate(matchup.gameStart)} at{' '}
              {formatTime(matchup.gameStart)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const TopBar: React.FC<{ currentLeague: CurrentLeague | null }> = ({ currentLeague }) => {
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar sx={{ position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', zIndex: 2 }}>
          <Link
            to={'/stat_keeper'}
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
        </Box>
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            textAlign: 'center',
            zIndex: 1,
          }}
        >
          <Typography variant="h5" sx={{ fontSize: '1.5em' }}>
            New Game
          </Typography>
          {currentLeague && (
            <Typography variant="body2" sx={{ fontSize: '0.85em', color: 'text.secondary' }}>
              {currentLeague.league.name}
            </Typography>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

const CreateGameSection: React.FC<{
  homeTeamIdStr: string;
  setHomeTeamIdStr: (id: string) => void;
  awayTeamIdStr: string;
  setAwayTeamIdStr: (id: string) => void;
  availableHomeTeams: any[];
  availableAwayTeams: any[];
  selectedHomeTeamObj: any;
  selectedAwayTeamObj: any;
  week: number;
  setWeek: (week: number) => void;
}> = ({
  homeTeamIdStr,
  setHomeTeamIdStr,
  awayTeamIdStr,
  setAwayTeamIdStr,
  availableHomeTeams,
  availableAwayTeams,
  selectedHomeTeamObj,
  selectedAwayTeamObj,
  week,
  setWeek,
}) => {
  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2, flexShrink: 0 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Create Game
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TeamPicker
          label="Home"
          teamIdStr={homeTeamIdStr}
          setTeamIdStr={setHomeTeamIdStr}
          availableTeams={availableHomeTeams}
          selectedTeamObj={selectedHomeTeamObj}
          disabled={availableHomeTeams.length === 0 && !homeTeamIdStr}
        />

        <TeamPicker
          label="Away"
          teamIdStr={awayTeamIdStr}
          setTeamIdStr={setAwayTeamIdStr}
          availableTeams={availableAwayTeams}
          selectedTeamObj={selectedAwayTeamObj}
          disabled={availableAwayTeams.length === 0 && !awayTeamIdStr}
        />
      </Box>
      <TextField
        id="week-select"
        label="Week"
        type="number"
        value={week}
        onChange={e => setWeek(parseInt(e.target.value, 10) || 1)}
        inputProps={{ min: 1 }}
        sx={{ width: '120px' }}
      />
    </Paper>
  );
};

const ActionBar: React.FC<{
  handleCreateGame: () => Promise<void>;
  canCreateGame: boolean;
}> = ({ handleCreateGame, canCreateGame }) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70px',
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
        disabled={!canCreateGame}
        sx={{ fontSize: '1em', px: 3 }}
      >
        Create Game
      </Button>
    </Box>
  );
};

function NewGame() {
  const navigate = useNavigate();
  useFullscreen();

  const [currentLeague, setCurrentLeague] = useState<CurrentLeague | null>(null);
  const [loadingLeague, setLoadingLeague] = useState<boolean>(true);
  const [errorLeague, setErrorLeague] = useState<string | null>(null);

  const { leagueTeams, loadingTeams, errorTeams } = useTeams(currentLeague?.league?.id?.toString());

  const { schedule, loadingSchedule, errorSchedule } = useSchedule(
    currentLeague?.league?.id?.toString()
  );

  const [week, setWeek] = useState<number>(1);
  const [homeTeamIdStr, setHomeTeamIdStr] = useState<string>('');
  const [awayTeamIdStr, setAwayTeamIdStr] = useState<string>('');
  const [selectedMatchupId, setSelectedMatchupId] = useState<number | null>(null);

  useEffect(() => {
    const loadCurrentLeague = async () => {
      setLoadingLeague(true);
      setErrorLeague(null);
      try {
        const response = await fetch('/current_league');
        const league = await response.json();
        setCurrentLeague(league);
      } catch (error) {
        console.error('Failed to fetch current league:', error);
        setErrorLeague(error instanceof Error ? error.message : 'Failed to load current league');
      } finally {
        setLoadingLeague(false);
      }
    };

    loadCurrentLeague();
  }, []);

  useEffect(() => {
    setHomeTeamIdStr('');
    setAwayTeamIdStr('');
    setSelectedMatchupId(null);
  }, [currentLeague]);

  const handleSelectMatchup = (matchup: Matchup) => {
    setSelectedMatchupId(matchup.id);
    setHomeTeamIdStr(matchup.homeTeamId.toString());
    setAwayTeamIdStr(matchup.awayTeamId.toString());
    setWeek(matchup.week);
  };

  const selectedHomeTeamObj = leagueTeams.find(t => t.id.toString() === homeTeamIdStr);
  const selectedAwayTeamObj = leagueTeams.find(t => t.id.toString() === awayTeamIdStr);

  const handleCreateGame = async () => {
    if (!currentLeague?.league?.id || !selectedHomeTeamObj || !selectedAwayTeamObj) {
      alert('Please select both teams.');
      return;
    }

    try {
      const homeRoster = selectedHomeTeamObj.players.map(p => ({ 
        name: p.name, 
        is_open: p.is_open 
      }));
      const awayRoster = selectedAwayTeamObj.players.map(p => ({ 
        name: p.name, 
        is_open: p.is_open 
      }));

      // The team objects should already have is_open from the normalized data
      const homeTeamWithGender = selectedHomeTeamObj;
      const awayTeamWithGender = selectedAwayTeamObj;

      const id = await Bookkeeper.newGame(
        currentLeague,
        week,
        homeTeamWithGender,
        awayTeamWithGender,
        homeRoster,
        awayRoster
      );
      console.log(`New game added with localId: ${id}`);
      navigate(`/stat_keeper/game/${id}`);
    } catch (error) {
      console.error('Failed to create new game:', error);
      alert(`Failed to create game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const availableAwayTeams = leagueTeams.filter(t => t.id.toString() !== homeTeamIdStr);
  const availableHomeTeams = leagueTeams.filter(t => t.id.toString() !== awayTeamIdStr);

  const canCreateGame = selectedHomeTeamObj && selectedAwayTeamObj;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopBar currentLeague={currentLeague} />

      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          p: 2,
          pb: '86px',
        }}
      >
        {loadingLeague && <Typography sx={{ p: 2 }}>Loading current league...</Typography>}
        {errorLeague && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorLeague}
          </Alert>
        )}
        {!currentLeague && !loadingLeague && !errorLeague && (
          <Alert severity="error" sx={{ mb: 2 }}>
            No league data available
          </Alert>
        )}

        {loadingTeams && <Typography sx={{ flexShrink: 0, p: 2 }}>Loading teams...</Typography>}
        {errorTeams && (
          <Typography sx={{ color: 'error.main', flexShrink: 0, p: 2 }}>
            Error: {errorTeams}
          </Typography>
        )}

        {!loadingTeams && !errorTeams && leagueTeams.length > 0 && (
          <>
            {loadingSchedule && (
              <Typography sx={{ flexShrink: 0, p: 2 }}>Loading schedule...</Typography>
            )}

            {!loadingSchedule && errorSchedule && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Could not load schedule: {errorSchedule}. Use manual selection below.
              </Alert>
            )}

            {!loadingSchedule && schedule && (
              <UpcomingMatchups
                matchups={schedule.matchups}
                teams={leagueTeams}
                onSelectMatchup={handleSelectMatchup}
                selectedMatchupId={selectedMatchupId}
              />
            )}

            <CreateGameSection
              homeTeamIdStr={homeTeamIdStr}
              setHomeTeamIdStr={setHomeTeamIdStr}
              awayTeamIdStr={awayTeamIdStr}
              setAwayTeamIdStr={setAwayTeamIdStr}
              availableHomeTeams={availableHomeTeams}
              availableAwayTeams={availableAwayTeams}
              selectedHomeTeamObj={selectedHomeTeamObj}
              selectedAwayTeamObj={selectedAwayTeamObj}
              week={week}
              setWeek={setWeek}
            />
          </>
        )}

        {leagueTeams.length === 0 && !loadingTeams && currentLeague?.league?.id && !errorTeams && (
          <Typography sx={{ flexShrink: 0, p: 2 }}>
            No teams found for the current league.
          </Typography>
        )}
      </Box>

      {!loadingTeams && !errorTeams && leagueTeams.length > 0 && (
        <ActionBar handleCreateGame={handleCreateGame} canCreateGame={!!canCreateGame} />
      )}
    </Box>
  );
}

export default NewGame;
