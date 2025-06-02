import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, StoredGame } from '../../db';
import { leagues, fetchLeagueTeams, LeagueTeam, TeamPlayer } from '../../api';

import EditRoster from './EditRoster';

function NewGameSetup() {
  const navigate = useNavigate();

  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(leagues.length > 0 ? leagues[0].id : '');
  const [leagueTeams, setLeagueTeams] = useState<LeagueTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);
  const [errorTeams, setErrorTeams] = useState<string | null>(null);

  const [homeTeamId, setHomeTeamId] = useState<string>('');
  const [awayTeamId, setAwayTeamId] = useState<string>('');

  const [week, setWeek] = useState<number>(1);

  const [homeRosterNames, setHomeRosterNames] = useState<string[]>([]);
  const [awayRosterNames, setAwayRosterNames] = useState<string[]>([]);

  const [allLeaguePlayers, setAllLeaguePlayers] = useState<TeamPlayer[]>([]);

  // Fetch teams when selectedLeagueId changes
  useEffect(() => {
    if (!selectedLeagueId) {
      setLeagueTeams([]);
      setAllLeaguePlayers([]);
      return;
    }
    const loadTeams = async () => {
      setLoadingTeams(true);
      setErrorTeams(null);
      setHomeTeamId(''); // Reset team selections
      setAwayTeamId('');
      setHomeRosterNames([]);
      setAwayRosterNames([]);
      try {
        const teams = await fetchLeagueTeams(selectedLeagueId);
        setLeagueTeams(teams);
        // Aggregate all players from all teams for the "add substitute from league" feature
        const allPlayers = teams.reduce((acc, team) => {
          team.players.forEach(p => {
            if (!acc.find(ap => ap.name === p.name)) { // Avoid duplicates if a player is listed in multiple contexts
              acc.push(p);
            }
          });
          return acc;
        }, [] as TeamPlayer[]);
        setAllLeaguePlayers(allPlayers);

      } catch (err) {
        setErrorTeams(err instanceof Error ? err.message : 'Failed to load teams');
        setLeagueTeams([]);
        setAllLeaguePlayers([]);
      } finally {
        setLoadingTeams(false);
      }
    };
    loadTeams();
  }, [selectedLeagueId]);

  const selectedHomeTeam = leagueTeams.find(t => t.id.toString() === homeTeamId);
  const selectedAwayTeam = leagueTeams.find(t => t.id.toString() === awayTeamId);

  // Update home roster when home team selection changes
  useEffect(() => {
    setHomeRosterNames(selectedHomeTeam ? selectedHomeTeam.players.map(p => p.name) : []);
  }, [selectedHomeTeam]);

  // Update away roster when away team selection changes
  useEffect(() => {
    setAwayRosterNames(selectedAwayTeam ? selectedAwayTeam.players.map(p => p.name) : []);
  }, [selectedAwayTeam]);


  const handleCreateGame = async () => {
    if (!selectedLeagueId || !selectedHomeTeam || !selectedAwayTeam || homeRosterNames.length === 0 || awayRosterNames.length === 0) {
      alert('Please select a league, both teams, and ensure rosters are not empty.');
      return;
    }

    const newGameData: Omit<StoredGame, 'localId'> = {
      serverId: undefined,
      league_id: selectedLeagueId,
      week: week,
      homeTeam: selectedHomeTeam.name,
      homeScore: 0,
      homeRoster: homeRosterNames,
      awayTeam: selectedAwayTeam.name,
      awayScore: 0,
      awayRoster: awayRosterNames,
      points: [],
      stats: undefined, // Or initialize as {} if appropriate
      status: 'new',
      lastModified: new Date(),
    };

    try {
      const id = await db.games.add(newGameData as StoredGame);
      console.log(`New game added with localId: ${id}`);
      navigate(`/stat_keeper/game/${id}`);
    } catch (error) {
      console.error("Failed to create new game:", error);
      alert(`Failed to create game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const availableAwayTeams = leagueTeams.filter(t => t.id.toString() !== homeTeamId);
  const availableHomeTeams = leagueTeams.filter(t => t.id.toString() !== awayTeamId);

  return (
    <div style={{ padding: '20px' }}>
      <Link to="/stat_keeper" style={{ marginBottom: '20px', display: 'inline-block' }}>
        &larr; Back to StatKeeper Home
      </Link>
      <h1>Create New Game</h1>

      {/* League Selection */}
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="league-select" style={{ marginRight: '10px' }}>League:</label>
        <select
          id="league-select"
          value={selectedLeagueId}
          onChange={(e) => setSelectedLeagueId(e.target.value)}
          style={{ padding: '8px' }}
        >
          {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {/* Week Selection */}
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="week-select" style={{ marginRight: '10px' }}>Week:</label>
        <input
            type="number"
            id="week-select"
            value={week}
            onChange={(e) => setWeek(parseInt(e.target.value,10) || 1)}
            min="1"
            style={{ padding: '8px' }}
        />
      </div>

      {loadingTeams && <p>Loading teams...</p>}
      {errorTeams && <p style={{ color: 'red' }}>Error: {errorTeams}</p>}

      {!loadingTeams && !errorTeams && leagueTeams.length > 0 && (
        <>
          {/* Team Selection */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ flex: 1, marginRight: '10px' }}>
              <label htmlFor="home-team-select" style={{ display: 'block', marginBottom: '5px' }}>Home Team:</label>
              <select
                id="home-team-select"
                value={homeTeamId}
                onChange={(e) => setHomeTeamId(e.target.value)}
                style={{ width: '100%', padding: '8px' }}
                disabled={availableHomeTeams.length === 0}
              >
                <option value="">Select Home Team</option>
                {availableHomeTeams.map(team => (
                  <option key={team.id} value={team.id.toString()}>{team.name}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, marginLeft: '10px' }}>
              <label htmlFor="away-team-select" style={{ display: 'block', marginBottom: '5px' }}>Away Team:</label>
              <select
                id="away-team-select"
                value={awayTeamId}
                onChange={(e) => setAwayTeamId(e.target.value)}
                style={{ width: '100%', padding: '8px' }}
                disabled={availableAwayTeams.length === 0}
              >
                <option value="">Select Away Team</option>
                {availableAwayTeams.map(team => (
                  <option key={team.id} value={team.id.toString()}>{team.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Roster Editing Section */}
          {selectedHomeTeam && (
            <EditRoster
              teamName={selectedHomeTeam.name}
              initialRosterPlayers={selectedHomeTeam.players}
              allLeaguePlayers={allLeaguePlayers}
              currentRosterNames={homeRosterNames}
              onRosterChange={setHomeRosterNames}
            />
          )}
          {selectedAwayTeam && (
            <EditRoster
              teamName={selectedAwayTeam.name}
              initialRosterPlayers={selectedAwayTeam.players}
              allLeaguePlayers={allLeaguePlayers}
              currentRosterNames={awayRosterNames}
              onRosterChange={setAwayRosterNames}
            />
          )}

          {(selectedHomeTeam && selectedAwayTeam) && (
            <button
                onClick={handleCreateGame}
                style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: 'green', color: 'white', border: 'none', borderRadius: '5px' }}
                disabled={homeRosterNames.length === 0 || awayRosterNames.length === 0}
            >
              Create Game & Start Stat-Taking
            </button>
          )}
        </>
      )}
       {leagueTeams.length === 0 && !loadingTeams && selectedLeagueId && <p>No teams found for the selected league.</p>}
    </div>
  );
}

export default NewGameSetup;
