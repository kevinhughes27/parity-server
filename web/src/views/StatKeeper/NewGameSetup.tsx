import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { db, StoredGame } from '../../db';
import { leagues, fetchLeagueTeams, LeagueTeam, TeamPlayer } from '../../api';

import EditRoster from './EditRoster';

function NewGameSetup() {
  const navigate = useNavigate();
  const { localGameId: paramGameId } = useParams<{ localGameId: string }>();

  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [loadedGameForEdit, setLoadedGameForEdit] = useState<StoredGame | null>(null);

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
  const [isInitialRosterSetForEdit, setIsInitialRosterSetForEdit] = useState(false);


  // Effect to handle loading game for editing
  useEffect(() => {
    const gameIdToEdit = paramGameId ? parseInt(paramGameId, 10) : null;
    if (gameIdToEdit && !isNaN(gameIdToEdit)) {
      setEditingGameId(gameIdToEdit);
      db.games.get(gameIdToEdit).then(game => {
        if (game) {
          setLoadedGameForEdit(game);
          setSelectedLeagueId(game.league_id); // This will trigger team loading
          setWeek(game.week);
          setIsInitialRosterSetForEdit(false); // Reset flag for new game load
        } else {
          navigate('/stat_keeper'); // Game not found, redirect
        }
      });
    } else {
      // Reset fields if navigating from edit mode to new game mode (e.g. browser back)
      setEditingGameId(null);
      setLoadedGameForEdit(null);
      setSelectedLeagueId(leagues.length > 0 ? leagues[0].id : '');
      setWeek(1);
      setHomeTeamId('');
      setAwayTeamId('');
      // Rosters will be cleared by team selection change effect
      setIsInitialRosterSetForEdit(false);
    }
  }, [paramGameId, navigate]);

  // Effect to fetch teams when selectedLeagueId changes
  useEffect(() => {
    if (!selectedLeagueId) {
      setLeagueTeams([]);
      setAllLeaguePlayers([]);
      return;
    }
    setLoadingTeams(true);
    setErrorTeams(null);
    // Don't reset team selections if we are loading for an existing game and teams for its league are being fetched
    if (!editingGameId || (loadedGameForEdit && selectedLeagueId !== loadedGameForEdit.league_id)) {
        setHomeTeamId(''); 
        setAwayTeamId('');
    }

    fetchLeagueTeams(selectedLeagueId)
      .then(teams => {
        setLeagueTeams(teams);
        const allPlayers = teams.reduce((acc, team) => {
          team.players.forEach(p => {
            if (!acc.find(ap => ap.name === p.name)) {
              acc.push(p);
            }
          });
          return acc;
        }, [] as TeamPlayer[]);
        setAllLeaguePlayers(allPlayers);
      })
      .catch(err => {
        setErrorTeams(err instanceof Error ? err.message : 'Failed to load teams');
        setLeagueTeams([]);
        setAllLeaguePlayers([]);
      })
      .finally(() => {
        setLoadingTeams(false);
      });
  }, [selectedLeagueId, editingGameId, loadedGameForEdit]);

  // Effect to populate team IDs and rosters when editing and teams are loaded
  useEffect(() => {
    if (editingGameId && loadedGameForEdit && leagueTeams.length > 0 && !isInitialRosterSetForEdit) {
      const homeTeam = leagueTeams.find(t => t.name === loadedGameForEdit.homeTeam);
      const awayTeam = leagueTeams.find(t => t.name === loadedGameForEdit.awayTeam);

      if (homeTeam) setHomeTeamId(homeTeam.id.toString());
      if (awayTeam) setAwayTeamId(awayTeam.id.toString());
      
      // Set rosters from the loaded game *after* team IDs are potentially set
      // This ensures EditRoster receives initialRosterPlayers based on selected team,
      // but then we immediately set the actual saved roster.
      setHomeRosterNames([...loadedGameForEdit.homeRoster]);
      setAwayRosterNames([...loadedGameForEdit.awayRoster]);
      setIsInitialRosterSetForEdit(true); // Mark as set to prevent re-running this part
    }
  }, [editingGameId, loadedGameForEdit, leagueTeams, isInitialRosterSetForEdit]);


  const selectedHomeTeamObj = leagueTeams.find(t => t.id.toString() === homeTeamId);
  const selectedAwayTeamObj = leagueTeams.find(t => t.id.toString() === awayTeamId);

  // Update home roster when home team selection changes (for new games or if team is changed during edit)
   useEffect(() => {
    if (editingGameId && isInitialRosterSetForEdit && selectedHomeTeamObj?.name === loadedGameForEdit?.homeTeam) {
      // If editing, initial roster is set, and team hasn't changed from loaded game, don't override with default
      return;
    }
    setHomeRosterNames(selectedHomeTeamObj ? selectedHomeTeamObj.players.map(p => p.name) : []);
  }, [selectedHomeTeamObj, editingGameId, isInitialRosterSetForEdit, loadedGameForEdit]);

  // Update away roster when away team selection changes (for new games or if team is changed during edit)
  useEffect(() => {
    if (editingGameId && isInitialRosterSetForEdit && selectedAwayTeamObj?.name === loadedGameForEdit?.awayTeam) {
      // If editing, initial roster is set, and team hasn't changed from loaded game, don't override with default
      return;
    }
    setAwayRosterNames(selectedAwayTeamObj ? selectedAwayTeamObj.players.map(p => p.name) : []);
  }, [selectedAwayTeamObj, editingGameId, isInitialRosterSetForEdit, loadedGameForEdit]);


  const handleSaveGame = async () => {
    if (!selectedLeagueId || !selectedHomeTeamObj || !selectedAwayTeamObj || homeRosterNames.length === 0 || awayRosterNames.length === 0) {
      alert('Please select a league, both teams, and ensure rosters are not empty.');
      return;
    }

    const gameDataPayload = {
      league_id: selectedLeagueId,
      week: week,
      homeTeam: selectedHomeTeamObj.name,
      homeScore: editingGameId && loadedGameForEdit ? loadedGameForEdit.homeScore : 0,
      homeRoster: homeRosterNames,
      awayTeam: selectedAwayTeamObj.name,
      awayScore: editingGameId && loadedGameForEdit ? loadedGameForEdit.awayScore : 0,
      awayRoster: awayRosterNames,
      points: editingGameId && loadedGameForEdit ? loadedGameForEdit.points : [],
      stats: editingGameId && loadedGameForEdit ? loadedGameForEdit.stats : undefined,
      status: editingGameId && loadedGameForEdit ? loadedGameForEdit.status : 'new',
      lastModified: new Date(),
      // serverId is not managed here, it's part of StoredGame but not directly editable in this form
    };

    try {
      if (editingGameId) {
        // Update existing game
        // Ensure we pass all StoredGame fields, even if not directly edited here (like serverId)
        const updatePayload: StoredGame = {
            ...loadedGameForEdit!, // Contains original serverId, localId etc.
            ...gameDataPayload, // Overwrite with new/edited fields
        };
        await db.games.update(editingGameId, updatePayload);
        console.log(`Game with localId: ${editingGameId} updated successfully.`);
        navigate(`/stat_keeper/game/${editingGameId}`);
      } else {
        // Create new game
        const newGameData: Omit<StoredGame, 'localId'> = {
            ...gameDataPayload,
            serverId: undefined, // Explicitly undefined for new games
        };
        const id = await db.games.add(newGameData as StoredGame);
        console.log(`New game added with localId: ${id}`);
        navigate(`/stat_keeper/game/${id}`);
      }
    } catch (error) {
      console.error("Failed to save game:", error);
      alert(`Failed to save game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const availableAwayTeams = leagueTeams.filter(t => t.id.toString() !== homeTeamId);
  const availableHomeTeams = leagueTeams.filter(t => t.id.toString() !== awayTeamId);

  const pageTitle = editingGameId ? "Edit Game Setup" : "Create New Game";
  const buttonText = editingGameId ? "Update Game Details" : "Create Game & Start Stat-Taking";

  return (
    <div style={{ padding: '20px' }}>
      <Link to={editingGameId ? `/stat_keeper/game/${editingGameId}` : "/stat_keeper"} style={{ marginBottom: '20px', display: 'inline-block' }}>
        &larr; Back
      </Link>
      <h1>{pageTitle}</h1>

      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="league-select" style={{ marginRight: '10px' }}>League:</label>
        <select
          id="league-select"
          value={selectedLeagueId}
          onChange={(e) => {
            setSelectedLeagueId(e.target.value);
            setIsInitialRosterSetForEdit(false); // If league changes, rosters need re-evaluation
          }}
          style={{ padding: '8px' }}
        >
          {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      
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
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ flex: 1, marginRight: '10px' }}>
              <label htmlFor="home-team-select" style={{ display: 'block', marginBottom: '5px' }}>Home Team:</label>
              <select
                id="home-team-select"
                value={homeTeamId}
                onChange={(e) => {
                    setHomeTeamId(e.target.value);
                    // If editing, changing team should reset initial roster flag for that team
                    if(editingGameId && loadedGameForEdit && selectedHomeTeamObj?.name !== loadedGameForEdit.homeTeam) {
                        setIsInitialRosterSetForEdit(false); 
                    }
                }}
                style={{ width: '100%', padding: '8px' }}
                disabled={availableHomeTeams.length === 0 && !homeTeamId}
              >
                <option value="">Select Home Team</option>
                {availableHomeTeams.map(team => (
                  <option key={team.id} value={team.id.toString()}>{team.name}</option>
                ))}
                 {/* Ensure selected team is in list even if it would be filtered out */}
                {homeTeamId && !availableHomeTeams.find(t => t.id.toString() === homeTeamId) && selectedHomeTeamObj && (
                    <option key={selectedHomeTeamObj.id} value={selectedHomeTeamObj.id.toString()}>{selectedHomeTeamObj.name}</option>
                )}
              </select>
            </div>
            <div style={{ flex: 1, marginLeft: '10px' }}>
              <label htmlFor="away-team-select" style={{ display: 'block', marginBottom: '5px' }}>Away Team:</label>
              <select
                id="away-team-select"
                value={awayTeamId}
                onChange={(e) => {
                    setAwayTeamId(e.target.value);
                     if(editingGameId && loadedGameForEdit && selectedAwayTeamObj?.name !== loadedGameForEdit.awayTeam) {
                        setIsInitialRosterSetForEdit(false);
                    }
                }}
                style={{ width: '100%', padding: '8px' }}
                disabled={availableAwayTeams.length === 0 && !awayTeamId}
              >
                <option value="">Select Away Team</option>
                {availableAwayTeams.map(team => (
                  <option key={team.id} value={team.id.toString()}>{team.name}</option>
                ))}
                {awayTeamId && !availableAwayTeams.find(t => t.id.toString() === awayTeamId) && selectedAwayTeamObj && (
                    <option key={selectedAwayTeamObj.id} value={selectedAwayTeamObj.id.toString()}>{selectedAwayTeamObj.name}</option>
                )}
              </select>
            </div>
          </div>

          {selectedHomeTeamObj && (
            <EditRoster
              teamName={selectedHomeTeamObj.name}
              initialRosterPlayers={selectedHomeTeamObj.players}
              allLeaguePlayers={allLeaguePlayers}
              currentRosterNames={homeRosterNames}
              onRosterChange={setHomeRosterNames}
            />
          )}
          {selectedAwayTeamObj && (
            <EditRoster
              teamName={selectedAwayTeamObj.name}
              initialRosterPlayers={selectedAwayTeamObj.players}
              allLeaguePlayers={allLeaguePlayers}
              currentRosterNames={awayRosterNames}
              onRosterChange={setAwayRosterNames}
            />
          )}
          
          {(selectedHomeTeamObj && selectedAwayTeamObj) && (
            <button 
                onClick={handleSaveGame} 
                style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: 'green', color: 'white', border: 'none', borderRadius: '5px' }}
                disabled={homeRosterNames.length === 0 || awayRosterNames.length === 0}
            >
              {buttonText}
            </button>
          )}
        </>
      )}
       {leagueTeams.length === 0 && !loadingTeams && selectedLeagueId && <p>No teams found for the selected league.</p>}
    </div>
  );
}

export default NewGameSetup;
