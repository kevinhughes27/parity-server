import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTeams, useFullscreen } from './hooks';
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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import EditRoster from './EditRoster';

interface CurrentLeague {
  league: {
    id: string;
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

const EmptyRosterPlaceholder: React.FC<{ teamType: string }> = ({ teamType }) => {
  return (
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
        border: '1px dashed #ccc',
      }}
    >
      <Typography color="text.secondary">Select {teamType} Team to edit roster.</Typography>
    </Paper>
  );
};

const TopBar: React.FC = () => {
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
        <Typography
          variant="h5"
          sx={{
            fontSize: '1.5em',
            position: 'absolute',
            left: 0,
            right: 0,
            textAlign: 'center',
            zIndex: 1,
          }}
        >
          New Game
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

const LeagueInfo: React.FC<{
  loadingLeague: boolean;
  errorLeague: string | null;
  currentLeague: CurrentLeague | null;
  week: number;
  setWeek: (week: number) => void;
}> = ({ loadingLeague, errorLeague, currentLeague, week, setWeek }) => {
  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2, flexShrink: 0 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {loadingLeague ? (
          <Typography>Loading current league...</Typography>
        ) : errorLeague ? (
          <Typography color="error">{errorLeague}</Typography>
        ) : currentLeague ? (
          <Typography variant="h6">League: {currentLeague.league.name}</Typography>
        ) : (
          <Typography color="error">No league data available</Typography>
        )}

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
  );
};

const TeamSelection: React.FC<{
  homeTeamIdStr: string;
  setHomeTeamIdStr: (id: string) => void;
  awayTeamIdStr: string;
  setAwayTeamIdStr: (id: string) => void;
  availableHomeTeams: any[];
  availableAwayTeams: any[];
  selectedHomeTeamObj: any;
  selectedAwayTeamObj: any;
}> = ({
  homeTeamIdStr,
  setHomeTeamIdStr,
  awayTeamIdStr,
  setAwayTeamIdStr,
  availableHomeTeams,
  availableAwayTeams,
  selectedHomeTeamObj,
  selectedAwayTeamObj,
}) => {
  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2, flexShrink: 0 }}>
      <Box sx={{ display: 'flex', gap: 2 }}>
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
    </Paper>
  );
};

const RosterEditing: React.FC<{
  selectedHomeTeamObj: any;
  selectedAwayTeamObj: any;
  homeRosterNames: string[];
  awayRosterNames: string[];
  sortAndSetHomeRoster: (roster: string[]) => void;
  sortAndSetAwayRoster: (roster: string[]) => void;
  allLeaguePlayers: any[];
}> = ({
  selectedHomeTeamObj,
  selectedAwayTeamObj,
  homeRosterNames,
  awayRosterNames,
  sortAndSetHomeRoster,
  sortAndSetAwayRoster,
  allLeaguePlayers,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        flexGrow: 1,
        overflow: 'hidden',
      }}
    >
      {/* Home Roster Column */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedHomeTeamObj ? (
          <EditRoster
            teamName={selectedHomeTeamObj.name}
            allLeaguePlayers={allLeaguePlayers}
            currentRosterNames={homeRosterNames}
            onRosterChange={sortAndSetHomeRoster}
          />
        ) : (
          <EmptyRosterPlaceholder teamType="Home" />
        )}
      </Box>

      {/* Away Roster Column */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedAwayTeamObj ? (
          <EditRoster
            teamName={selectedAwayTeamObj.name}
            allLeaguePlayers={allLeaguePlayers}
            currentRosterNames={awayRosterNames}
            onRosterChange={sortAndSetAwayRoster}
          />
        ) : (
          <EmptyRosterPlaceholder teamType="Away" />
        )}
      </Box>
    </Box>
  );
};

const ActionBar: React.FC<{
  handleCreateGame: () => Promise<void>;
  homeRosterNames: string[];
  awayRosterNames: string[];
}> = ({ handleCreateGame, homeRosterNames, awayRosterNames }) => {
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
        disabled={homeRosterNames.length === 0 || awayRosterNames.length === 0}
        sx={{ fontSize: '1em', px: 3 }}
      >
        Start
      </Button>
    </Box>
  );
};

const sortRoster = (roster: string[]): string[] => {
  return [...roster].sort((a, b) => a.localeCompare(b));
};

function NewGame() {
  const navigate = useNavigate();
  useFullscreen();

  const [currentLeague, setCurrentLeague] = useState<CurrentLeague | null>(null);
  const [loadingLeague, setLoadingLeague] = useState<boolean>(true);
  const [errorLeague, setErrorLeague] = useState<string | null>(null);

  const { leagueTeams, allLeaguePlayers, loadingTeams, errorTeams } = useTeams(
    currentLeague?.league?.id.toString()
  );

  const [week, setWeek] = useState<number>(1);
  const [homeTeamIdStr, setHomeTeamIdStr] = useState<string>('');
  const [awayTeamIdStr, setAwayTeamIdStr] = useState<string>('');
  const [homeRosterNames, setHomeRosterNames] = useState<string[]>([]);
  const [awayRosterNames, setAwayRosterNames] = useState<string[]>([]);

  const sortAndSetHomeRoster = (roster: string[]) => {
    setHomeRosterNames(sortRoster(roster));
  };

  const sortAndSetAwayRoster = (roster: string[]) => {
    setAwayRosterNames(sortRoster(roster));
  };

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
    sortAndSetHomeRoster([]);
    sortAndSetAwayRoster([]);
  }, [currentLeague]);

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
      !currentLeague?.league?.id ||
      !selectedHomeTeamObj ||
      !selectedAwayTeamObj ||
      homeRosterNames.length === 0 ||
      awayRosterNames.length === 0
    ) {
      alert('Please wait for league to load, select both teams, and ensure rosters are not empty.');
      return;
    }

    try {
      const id = await Bookkeeper.newGame(
        currentLeague,
        week,
        selectedHomeTeamObj,
        selectedAwayTeamObj,
        homeRosterNames,
        awayRosterNames
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopBar />

      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          p: 2,
          pb: '86px', // 70px for action bar + 16px padding
        }}
      >
        <LeagueInfo
          loadingLeague={loadingLeague}
          errorLeague={errorLeague}
          currentLeague={currentLeague}
          week={week}
          setWeek={setWeek}
        />

        {/* Loading/Error Messages */}
        {loadingTeams && <Typography sx={{ flexShrink: 0, p: 2 }}>Loading teams...</Typography>}
        {errorTeams && (
          <Typography sx={{ color: 'error.main', flexShrink: 0, p: 2 }}>
            Error: {errorTeams}
          </Typography>
        )}

        {/* Team Selectors and Roster Editors */}
        {!loadingTeams && !errorTeams && leagueTeams.length > 0 && (
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <TeamSelection
              homeTeamIdStr={homeTeamIdStr}
              setHomeTeamIdStr={setHomeTeamIdStr}
              awayTeamIdStr={awayTeamIdStr}
              setAwayTeamIdStr={setAwayTeamIdStr}
              availableHomeTeams={availableHomeTeams}
              availableAwayTeams={availableAwayTeams}
              selectedHomeTeamObj={selectedHomeTeamObj}
              selectedAwayTeamObj={selectedAwayTeamObj}
            />

            <RosterEditing
              selectedHomeTeamObj={selectedHomeTeamObj}
              selectedAwayTeamObj={selectedAwayTeamObj}
              homeRosterNames={homeRosterNames}
              awayRosterNames={awayRosterNames}
              sortAndSetHomeRoster={sortAndSetHomeRoster}
              sortAndSetAwayRoster={sortAndSetAwayRoster}
              allLeaguePlayers={allLeaguePlayers}
            />
          </Box>
        )}

        {/* Message if no teams found */}
        {leagueTeams.length === 0 && !loadingTeams && currentLeague?.league?.id && !errorTeams && (
          <Typography sx={{ flexShrink: 0, p: 2 }}>
            No teams found for the current league.
          </Typography>
        )}
      </Box>

      {/* Fixed Bottom Action Bar */}
      {!loadingTeams &&
        !errorTeams &&
        leagueTeams.length > 0 &&
        selectedHomeTeamObj &&
        selectedAwayTeamObj && (
          <ActionBar
            handleCreateGame={handleCreateGame}
            homeRosterNames={homeRosterNames}
            awayRosterNames={awayRosterNames}
          />
        )}
    </Box>
  );
}

export default NewGame;
