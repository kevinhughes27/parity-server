import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, StoredGame } from './db';
import { leagues as apiLeagues } from '../../api'; // Renamed import
import { useTeams } from './hooks';
import { BookkeeperVolatileState, SerializedMemento } from './models';

import EditRoster from './EditRoster';

const ACTION_BAR_HEIGHT = '70px'; // Consistent height for the bottom action bar

const placeholderRosterStyle: React.CSSProperties = {
  border: '1px dashed #ccc',
  padding: '20px',
  textAlign: 'center',
  height: '100%', // Fill the column
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f9f9f9',
  borderRadius: '5px',
  boxSizing: 'border-box',
  fontSize: '0.9em',
  color: '#555',
};

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
      homeParticipants: [...homeRosterNames].sort((a,b) => a.localeCompare(b)), // Ensure sorted on save
      awayParticipants: [...awayRosterNames].sort((a,b) => a.localeCompare(b)), // Ensure sorted on save
    };

    const initialMementos: SerializedMemento[] = [];

    const newGameData: Omit<StoredGame, 'localId'> = {
      serverId: undefined,
      league_id: selectedLeagueId,
      week: week,
      homeTeam: selectedHomeTeamObj.name,
      homeTeamId: selectedHomeTeamObj.id,
      homeScore: 0,
      homeRoster: [...homeRosterNames].sort((a,b) => a.localeCompare(b)), // Ensure sorted on save
      awayTeam: selectedAwayTeamObj.name,
      awayTeamId: selectedAwayTeamObj.id,
      awayScore: 0,
      awayRoster: [...awayRosterNames].sort((a,b) => a.localeCompare(b)), // Ensure sorted on save
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
  const buttonText = 'Create Game & Start Stat-Taking';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 15px',
          borderBottom: '1px solid #eee',
          backgroundColor: '#f8f9fa',
        }}
      >
        <Link
          to={'/stat_keeper'}
          style={{ fontSize: '0.9em', display: 'block', marginBottom: '5px' }}
        >
          &larr; Back to StatKeeper Home
        </Link>
        <h1 style={{ fontSize: '1.5em', margin: '0', textAlign: 'center' }}>{pageTitle}</h1>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flexGrow: 1, // Takes available vertical space
          display: 'flex', // Enables flex for children
          flexDirection: 'column', // Stacks children vertically
          overflowY: 'auto', // Allows this section to scroll if its content overflows
          padding: '15px',
          paddingBottom: `calc(${ACTION_BAR_HEIGHT} + 15px)`, // Space for the fixed action bar
        }}
      >
        {/* Section 1: League and Week Selectors (does not grow vertically) */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="league-select" style={{ flexShrink: 0 }}>
              League:
            </label>
            <select
              id="league-select"
              value={selectedLeagueId}
              onChange={e => setSelectedLeagueId(e.target.value)}
              style={{ padding: '8px', flexGrow: 1 }}
            >
              {apiLeagues.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="week-select" style={{ flexShrink: 0 }}>
              Week:
            </label>
            <input
              type="number"
              id="week-select"
              value={week}
              onChange={e => setWeek(parseInt(e.target.value, 10) || 1)}
              min="1"
              style={{ padding: '8px', width: '80px' }}
            />
          </div>
        </div>

        {/* Loading/Error Messages (does not grow vertically) */}
        {loadingTeams && <p style={{ flexShrink: 0 }}>Loading teams...</p>}
        {errorTeams && <p style={{ color: 'red', flexShrink: 0 }}>Error: {errorTeams}</p>}

        {/* Section 2: Team Selectors and Roster Editors (this section grows vertically) */}
        {!loadingTeams && !errorTeams && leagueTeams.length > 0 && (
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' /* Important: children manage their height/scroll */ }}>
            {/* Team Selection Dropdowns (does not grow vertically within this section) */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexShrink: 0 }}>
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="home-team-select"
                  style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
                >
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
                      <option
                        key={selectedHomeTeamObj.id}
                        value={selectedHomeTeamObj.id.toString()}
                      >
                        {selectedHomeTeamObj.name}
                      </option>
                    )}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="away-team-select"
                  style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
                >
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
                      <option
                        key={selectedAwayTeamObj.id}
                        value={selectedAwayTeamObj.id.toString()}
                      >
                        {selectedAwayTeamObj.name}
                      </option>
                    )}
                </select>
              </div>
            </div>

            {/* Roster Editing Columns (this div grows vertically to fill space, and its children are side-by-side) */}
            <div style={{ display: 'flex', gap: '20px', flexGrow: 1, overflow: 'hidden' /* Children (EditRoster/Placeholder) will fill height */ }}>
              {/* Home Roster Column */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {selectedHomeTeamObj ? (
                  <EditRoster
                    teamName={selectedHomeTeamObj.name}
                    allLeaguePlayers={allLeaguePlayers} // Already sorted from useTeams
                    currentRosterNames={homeRosterNames} // Already sorted by sortAndSetHomeRoster
                    onRosterChange={sortAndSetHomeRoster} // Pass the sorting setter
                  />
                ) : (
                  <div style={placeholderRosterStyle}>
                    <p>Select Home Team to edit roster.</p>
                  </div>
                )}
              </div>
              {/* Away Roster Column */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {selectedAwayTeamObj ? (
                  <EditRoster
                    teamName={selectedAwayTeamObj.name}
                    allLeaguePlayers={allLeaguePlayers} // Already sorted from useTeams
                    currentRosterNames={awayRosterNames} // Already sorted by sortAndSetAwayRoster
                    onRosterChange={sortAndSetAwayRoster} // Pass the sorting setter
                  />
                ) : (
                  <div style={placeholderRosterStyle}>
                    <p>Select Away Team to edit roster.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Message if no teams found (does not grow vertically) */}
        {leagueTeams.length === 0 && !loadingTeams && selectedLeagueId && !errorTeams && (
          <p style={{ flexShrink: 0 }}>No teams found for the selected league.</p>
        )}
      </div>

      {/* Fixed Bottom Action Bar */}
      {!loadingTeams && !errorTeams && leagueTeams.length > 0 && selectedHomeTeamObj && selectedAwayTeamObj && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: ACTION_BAR_HEIGHT,
            padding: '10px 15px',
            backgroundColor: 'white',
            borderTop: '1px solid #ccc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            zIndex: 100,
          }}
        >
          <button
            onClick={handleCreateGame}
            style={{
              padding: '10px 20px',
              fontSize: '1em',
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
        </div>
      )}
    </div>
  );
}

export default NewGame;
