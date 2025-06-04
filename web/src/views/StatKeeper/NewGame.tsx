import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, StoredGame } from './db';
import { leagues as apiLeagues } from '../../api'; // Renamed import
import { useTeams } from './hooks';
import { BookkeeperVolatileState, SerializedMemento } from './models';

import EditRoster from './EditRoster';

function NewGame() {
  const navigate = useNavigate();

  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(apiLeagues[0].id);

  const { leagueTeams, allLeaguePlayers, loadingTeams, errorTeams } = useTeams(selectedLeagueId);

  const [homeTeamIdStr, setHomeTeamIdStr] = useState<string>(''); // Store as string from select
  const [awayTeamIdStr, setAwayTeamIdStr] = useState<string>(''); // Store as string from select
  const [week, setWeek] = useState<number>(1);
  const [homeRosterNames, setHomeRosterNames] = useState<string[]>([]);
  const [awayRosterNames, setAwayRosterNames] = useState<string[]>([]);

  // Effect to reset team selections when league changes
  useEffect(() => {
    setHomeTeamIdStr('');
    setAwayTeamIdStr('');
  }, [selectedLeagueId]);

  const selectedHomeTeamObj = leagueTeams.find(t => t.id.toString() === homeTeamIdStr);
  const selectedAwayTeamObj = leagueTeams.find(t => t.id.toString() === awayTeamIdStr);

  useEffect(() => {
    setHomeRosterNames(selectedHomeTeamObj ? selectedHomeTeamObj.players.map(p => p.name) : []);
  }, [selectedHomeTeamObj]);

  useEffect(() => {
    setAwayRosterNames(selectedAwayTeamObj ? selectedAwayTeamObj.players.map(p => p.name) : []);
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
      homePossession: true, // Default, can be changed by coin toss logic later if implemented
      pointsAtHalf: 0,
      homePlayers: null,
      awayPlayers: null,
      homeScore: 0,
      awayScore: 0,
      homeParticipants: [...homeRosterNames], // Initialize with full roster
      awayParticipants: [...awayRosterNames], // Initialize with full roster
    };

    const initialMementos: SerializedMemento[] = [];

    const newGameData: Omit<StoredGame, 'localId'> = {
      serverId: undefined,
      league_id: selectedLeagueId,
      week: week,
      homeTeam: selectedHomeTeamObj.name,
      homeTeamId: selectedHomeTeamObj.id, // Save numeric ID
      homeScore: 0, // Will be driven by bookkeeperState
      homeRoster: homeRosterNames, // Initial roster
      awayTeam: selectedAwayTeamObj.name,
      awayTeamId: selectedAwayTeamObj.id, // Save numeric ID
      awayScore: 0, // Will be driven by bookkeeperState
      awayRoster: awayRosterNames, // Initial roster
      points: [], // Starts empty
      status: 'new',
      lastModified: new Date(),
      bookkeeperState: initialBookkeeperState, // Add initial state
      mementos: initialMementos, // Add initial mementos
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
  const buttonText = 'Create Game & Start Stat-Taking';

  return (
    <div style={{ padding: '20px', paddingBottom: '40px' }}>
      <Link to={'/stat_keeper'} style={{ marginBottom: '20px', display: 'inline-block' }}>
        &larr; Back to StatKeeper Home
      </Link>
      <h1>{pageTitle}</h1>

      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="league-select" style={{ marginRight: '10px' }}>
          League:
        </label>
        <select
          id="league-select"
          value={selectedLeagueId}
          onChange={e => setSelectedLeagueId(e.target.value)}
          style={{ padding: '8px' }}
        >
          {apiLeagues.map(l => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="week-select" style={{ marginRight: '10px' }}>
          Week:
        </label>
        <input
          type="number"
          id="week-select"
          value={week}
          onChange={e => setWeek(parseInt(e.target.value, 10) || 1)}
          min="1"
          style={{ padding: '8px' }}
        />
      </div>

      {loadingTeams && <p>Loading teams...</p>}
      {errorTeams && <p style={{ color: 'red' }}>Error: {errorTeams}</p>}

      {!loadingTeams && !errorTeams && leagueTeams.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ flex: 1, marginRight: '10px' }}>
              <label htmlFor="home-team-select" style={{ display: 'block', marginBottom: '5px' }}>
                Home Team:
              </label>
              <select
                id="home-team-select"
                value={homeTeamIdStr}
                onChange={e => setHomeTeamIdStr(e.target.value)}
                style={{ width: '100%', padding: '8px' }}
                disabled={availableHomeTeams.length === 0 && !homeTeamIdStr}
              >
                <option value="">Select Home Team</option>
                {availableHomeTeams.map(team => (
                  <option key={team.id} value={team.id.toString()}>
                    {team.name}
                  </option>
                ))}
                {homeTeamIdStr &&
                  !availableHomeTeams.find(t => t.id.toString() === homeTeamIdStr) &&
                  selectedHomeTeamObj && (
                    <option key={selectedHomeTeamObj.id} value={selectedHomeTeamObj.id.toString()}>
                      {selectedHomeTeamObj.name}
                    </option>
                  )}
              </select>
            </div>
            <div style={{ flex: 1, marginLeft: '10px' }}>
              <label htmlFor="away-team-select" style={{ display: 'block', marginBottom: '5px' }}>
                Away Team:
              </label>
              <select
                id="away-team-select"
                value={awayTeamIdStr}
                onChange={e => setAwayTeamIdStr(e.target.value)}
                style={{ width: '100%', padding: '8px' }}
                disabled={availableAwayTeams.length === 0 && !awayTeamIdStr}
              >
                <option value="">Select Away Team</option>
                {availableAwayTeams.map(team => (
                  <option key={team.id} value={team.id.toString()}>
                    {team.name}
                  </option>
                ))}
                {awayTeamIdStr &&
                  !availableAwayTeams.find(t => t.id.toString() === awayTeamIdStr) &&
                  selectedAwayTeamObj && (
                    <option key={selectedAwayTeamObj.id} value={selectedAwayTeamObj.id.toString()}>
                      {selectedAwayTeamObj.name}
                    </option>
                  )}
              </select>
            </div>
          </div>

          {selectedHomeTeamObj && (
            <EditRoster
              teamName={selectedHomeTeamObj.name}
              allLeaguePlayers={allLeaguePlayers}
              currentRosterNames={homeRosterNames}
              onRosterChange={setHomeRosterNames}
            />
          )}
          {selectedAwayTeamObj && (
            <EditRoster
              teamName={selectedAwayTeamObj.name}
              allLeaguePlayers={allLeaguePlayers}
              currentRosterNames={awayRosterNames}
              onRosterChange={setAwayRosterNames}
            />
          )}

          {selectedHomeTeamObj && selectedAwayTeamObj && (
            <button
              onClick={handleCreateGame}
              style={{
                marginBottom: '20px',
                padding: '10px 20px',
                fontSize: '16px',
                cursor: 'pointer',
                backgroundColor: 'green',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
              }}
              disabled={homeRosterNames.length === 0 || awayRosterNames.length === 0}
            >
              {buttonText}
            </button>
          )}
        </>
      )}
      {leagueTeams.length === 0 && !loadingTeams && selectedLeagueId && !errorTeams && (
        <p>No teams found for the selected league.</p>
      )}
    </div>
  );
}

export default NewGame;
