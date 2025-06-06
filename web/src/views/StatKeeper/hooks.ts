import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoredGame } from './db';
import { fetchTeams, Team, TeamPlayer, leagues as apiLeagues } from '../../api'; // Added apiLeagues

// GAME_LOADING_SENTINEL is no longer needed with the 2-argument useLiveQuery.
// export const GAME_LOADING_SENTINEL = Symbol('loading_game_sentinel');

export interface UseLocalGameResult {
  game: StoredGame | undefined;
  isLoading: boolean;
  error: string | null;
  numericGameId: number | undefined;
}

export function useLocalGame(): UseLocalGameResult {
  const { localGameId: paramGameId } = useParams<{ localGameId: string }>();
  const [numericGameId, setNumericGameId] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  // isLoading will be derived directly from numericGameId and rawGameData state.

  useEffect(() => {
    setError(null); // Reset error on param change

    if (!paramGameId) {
      setError('No game ID provided in URL.');
      setNumericGameId(undefined);
      return;
    }

    const id = parseInt(paramGameId, 10);
    if (isNaN(id)) {
      setError('Invalid game ID format.');
      setNumericGameId(undefined);
    } else {
      setNumericGameId(id);
    }
  }, [paramGameId]);

  const rawGameData = useLiveQuery<StoredGame | undefined>(
    async () => {
      if (numericGameId === undefined) {
        return undefined; // Don't query if ID is not valid or not set
      }
      return db.games.get(numericGameId);
    },
    [numericGameId] // Dependency: re-run query if numericGameId changes
  );

  // Determine loading and error states based on query result and ID
  const isLoading = numericGameId !== undefined && rawGameData === undefined && !error;

  useEffect(() => {
    // This effect sets an error if the ID is valid but no game is found after the query.
    if (numericGameId !== undefined && rawGameData === undefined && !isLoading) {
      // If still not loading (query has run) and data is undefined, then it's not found.
      // Check if an error isn't already set by the ID parsing logic.
      if (!error) {
        setError(`Game with ID ${numericGameId} not found.`);
      }
    } else if (rawGameData !== undefined && error) {
      // If data is found, clear any "not found" error.
      // This handles cases where an error might have been set transiently.
      if (error === `Game with ID ${numericGameId} not found.`) {
        setError(null);
      }
    }
  }, [numericGameId, rawGameData, isLoading, error]);

  return {
    game: rawGameData,
    isLoading,
    error,
    numericGameId,
  };
}

export interface UseTeamsResult {
  leagueTeams: Team[]; // Teams within the league
  allLeaguePlayers: TeamPlayer[]; // All unique players across those teams
  apiLeague: (typeof apiLeagues)[0] | undefined; // The specific league object from apiLeagues
  loadingTeams: boolean;
  errorTeams: string | null;
}

export function useFullscreen() {
  const location = useLocation();
  
  useEffect(() => {
    const elem = document.documentElement;
    const requestFullScreen =
      elem.requestFullscreen ||
      (elem as any).mozRequestFullScreen ||
      (elem as any).webkitRequestFullscreen ||
      (elem as any).msRequestFullscreen;
    
    // Always try to enter fullscreen when component mounts if not already in fullscreen
    if (requestFullScreen && !document.fullscreenElement) {
      // Add a small delay to ensure the component is fully mounted
      const timer = setTimeout(() => {
        requestFullScreen.call(elem).catch((err: Error) => {
          console.warn(`Fullscreen request failed: ${err.message} (${err.name})`);
          // Note: Fullscreen requests usually require a user gesture.
          // Automatic requests might be blocked by the browser.
        });
      }, 100);
      
      return () => {
        clearTimeout(timer);
      };
    }
    
    // No exit fullscreen logic - we want to stay in fullscreen mode
    return () => {};
  }, [location.pathname]);
}

export function useTeams(leagueId: string | undefined): UseTeamsResult {
  const [leagueTeams, setLeagueTeams] = useState<Team[]>([]);
  const [allLeaguePlayers, setAllLeaguePlayers] = useState<TeamPlayer[]>([]);
  const [apiLeague, setApiLeague] = useState<(typeof apiLeagues)[0] | undefined>(undefined);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);
  const [errorTeams, setErrorTeams] = useState<string | null>(null);

  useEffect(() => {
    if (leagueId === undefined) {
      setLeagueTeams([]);
      setAllLeaguePlayers([]);
      setApiLeague(undefined);
      setLoadingTeams(false);
      setErrorTeams(null);
      return;
    }

    setLoadingTeams(true);
    setErrorTeams(null);
    setLeagueTeams([]);
    setAllLeaguePlayers([]);

    const foundApiLeague = apiLeagues.find(l => l.id === leagueId);
    setApiLeague(foundApiLeague);

    if (!foundApiLeague) {
      setErrorTeams(`League configuration for ID ${leagueId} not found locally.`);
      setLoadingTeams(false);
      return;
    }

    fetchTeams(leagueId)
      .then(teams => {
        const sortedTeams = teams.map(team => ({
          ...team,
          players: [...team.players].sort((a, b) => a.name.localeCompare(b.name)),
        }));
        setLeagueTeams(sortedTeams);

        const allPlayers = sortedTeams.reduce((acc, team) => {
          team.players.forEach(p => {
            if (!acc.some(ap => ap.name === p.name)) {
              acc.push(p);
            }
          });
          return acc;
        }, [] as TeamPlayer[]);
        setAllLeaguePlayers([...allPlayers].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(err => {
        setErrorTeams(err instanceof Error ? err.message : 'Failed to load teams from API');
        setLeagueTeams([]);
        setAllLeaguePlayers([]);
      })
      .finally(() => {
        setLoadingTeams(false);
      });
  }, [leagueId]);

  return { leagueTeams, allLeaguePlayers, apiLeague, loadingTeams, errorTeams };
}
