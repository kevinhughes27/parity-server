import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoredGame } from './db'; // Updated import path
import { leagues, fetchLeagueTeams, LeagueTeam, TeamPlayer } from '../../api';
import EditRoster from './EditRoster';

const getLeagueName = (leagueId: string): string => {
  const league = leagues.find(l => l.id === leagueId);
  return league ? league.name : `Unknown League (${leagueId})`;
};

const LOADING_GAME_SENTINEL = Symbol("loading_game");

function EditGame() { 
  const navigate = useNavigate();
  const { localGameId: paramGameId } = useParams<{ localGameId: string }>();
  const numericGameId = paramGameId ? parseInt(paramGameId, 10) : undefined;

  const [homeRosterNames, setHomeRosterNames] = useState<string[]>([]);
  const [awayRosterNames, setAwayRosterNames] = useState<string[]>([]);
  const [allLeaguePlayers, setAllLeaguePlayers] = useState<TeamPlayer[]>([]);
  const [loadingLeaguePlayers, setLoadingLeaguePlayers] = useState<boolean>(false);
  const [errorLeaguePlayers, setErrorLeaguePlayers] = useState<string | null>(null);

  const game = useLiveQuery<StoredGame | undefined | typeof LOADING_GAME_SENTINEL>(
    async () => {
      if (numericGameId === undefined || isNaN(numericGameId)) {
        return undefined;
      }
      return db.games.get(numericGameId);
    },
    [numericGameId],
    LOADING_GAME_SENTINEL
  );

  useEffect(() => {
    if (game && game !== LOADING_GAME_SENTINEL && game.league_id) {
      setLoadingLeaguePlayers(true);
      setErrorLeaguePlayers(null);
      fetchLeagueTeams(game.league_id)
        .then(teams => {
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
          setErrorLeaguePlayers(err instanceof Error ? err.message : 'Failed to load league players');
          setAllLeaguePlayers([]);
        })
        .finally(() => {
          setLoadingLeaguePlayers(false);
        });
    }
  }, [game]);

  useEffect(() => {
    if (game && game !== LOADING_GAME_SENTINEL) {
      setHomeRosterNames([...game.homeRoster]);
      setAwayRosterNames([...game.awayRoster]);
    }
  }, [game]);


  const handleUpdateRosters = async () => {
    if (!game || game === LOADING_GAME_SENTINEL || numericGameId === undefined) {
      alert('Game data is not loaded correctly.');
      return;
    }
    if (homeRosterNames.length === 0 || awayRosterNames.length === 0) {
      alert('Rosters cannot be empty.');
      return;
    }

    const updatedGameData: Partial<StoredGame> = {
      homeRoster: homeRosterNames,
      awayRoster: awayRosterNames,
      lastModified: new Date(),
    };

    try {
      await db.games.update(numericGameId, updatedGameData);
      console.log(`Rosters for game localId: ${numericGameId} updated successfully.`);
      navigate(`/stat_keeper/game/${numericGameId}`);
    } catch (error) {
      console.error("Failed to update rosters:", error);
      alert(`Failed to update rosters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (numericGameId === undefined || isNaN(numericGameId)) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Invalid game ID provided.</p>
        <Link to="/stat_keeper">&larr; Back to StatKeeper Home</Link>
      </div>
    );
  }

  if (game === LOADING_GAME_SENTINEL) {
    return <p style={{ padding: '20px' }}>Loading game details...</p>;
  }

  if (!game) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Game with ID {paramGameId} not found.</p>
        <Link to="/stat_keeper">&larr; Back to StatKeeper Home</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', paddingBottom: '40px' }}>
      <Link to={`/stat_keeper/game/${numericGameId}`} style={{ marginBottom: '20px', display: 'inline-block' }}>
        &larr; Back to Game
      </Link>
      <h1>Edit Game Rosters: {game.homeTeam} vs {game.awayTeam}</h1>
      <div style={{ marginBottom: '20px', backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
        <p><strong>League:</strong> {getLeagueName(game.league_id)}</p>
        <p><strong>Week:</strong> {game.week}</p>
      </div>

      {loadingLeaguePlayers && <p>Loading league player data...</p>}
      {errorLeaguePlayers && <p style={{ color: 'red' }}>Error: {errorLeaguePlayers}</p>}

      {!loadingLeaguePlayers && !errorLeaguePlayers && (
        <>
          <EditRoster
            teamName={game.homeTeam}
            allLeaguePlayers={allLeaguePlayers}
            currentRosterNames={homeRosterNames}
            onRosterChange={setHomeRosterNames}
          />
          <EditRoster
            teamName={game.awayTeam}
            allLeaguePlayers={allLeaguePlayers}
            currentRosterNames={awayRosterNames}
            onRosterChange={setAwayRosterNames}
          />
          <button
            onClick={handleUpdateRosters}
            style={{ marginBottom: '20px', padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: 'blue', color: 'white', border: 'none', borderRadius: '5px' }}
            disabled={homeRosterNames.length === 0 || awayRosterNames.length === 0}
          >
            Update Rosters
          </button>
        </>
      )}
    </div>
  );
}

export default EditGame;
