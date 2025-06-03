import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoredGame } from './db';
import { fetchTeams, Team, TeamPlayer } from '../../api';

// --- Copied from useLocalGame.ts ---
// A unique sentinel value to represent the loading state for useLiveQuery's defaultValue
export const GAME_LOADING_SENTINEL = Symbol("loading_game_sentinel");

export interface UseLocalGameResult {
  game: StoredGame | undefined; // The resolved game object, or undefined if not found/error
  isLoading: boolean;
  error: string | null;
  numericGameId: number | undefined;
  rawGameData: StoredGame | undefined | typeof GAME_LOADING_SENTINEL; // Raw output from useLiveQuery, useful for useEffect dependencies
}

export function useLocalGame(): UseLocalGameResult {
  const { localGameId: paramGameId } = useParams<{ localGameId: string }>();
  const [numericGameId, setNumericGameId] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [internalIsLoading, setInternalIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setInternalIsLoading(true); // Start loading whenever paramGameId changes
    setError(null); // Reset error on param change

    if (!paramGameId) {
      setError("No game ID provided in URL.");
      setNumericGameId(undefined);
      setInternalIsLoading(false);
      return;
    }

    const id = parseInt(paramGameId, 10);
    if (isNaN(id)) {
      setError("Invalid game ID format.");
      setNumericGameId(undefined);
      setInternalIsLoading(false);
    } else {
      setNumericGameId(id);
    }
  }, [paramGameId]);

  const rawGameData = useLiveQuery<StoredGame | undefined | typeof GAME_LOADING_SENTINEL>(
    async () => {
      if (numericGameId === undefined) {
        return undefined;
      }
      return db.games.get(numericGameId);
    },
    [numericGameId], 
    GAME_LOADING_SENTINEL 
  );

  useEffect(() => {
    if (numericGameId === undefined) {
      setInternalIsLoading(false);
      return;
    }

    if (rawGameData === GAME_LOADING_SENTINEL) {
      setInternalIsLoading(true);
    } else if (rawGameData !== undefined) { 
      setInternalIsLoading(false);
      setError(null); 
    } else { 
      setInternalIsLoading(false);
      setError(`Game with ID ${numericGameId} not found.`);
    }
  }, [rawGameData, numericGameId]);


  const game = (rawGameData && rawGameData !== GAME_LOADING_SENTINEL) ? (rawGameData as StoredGame) : undefined;

  return {
    game,
    isLoading: internalIsLoading,
    error,
    numericGameId,
    rawGameData,
  };
}

// --- New useTeams hook ---
export interface UseTeamsResult {
  leagueTeams: Team[];
  allLeaguePlayers: TeamPlayer[];
  loadingTeams: boolean;
  errorTeams: string | null;
}

export function useTeams(leagueId: number | undefined): UseTeamsResult {
  const [leagueTeams, setLeagueTeams] = useState<Team[]>([]);
  const [allLeaguePlayers, setAllLeaguePlayers] = useState<TeamPlayer[]>([]);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);
  const [errorTeams, setErrorTeams] = useState<string | null>(null);

  useEffect(() => {
    if (leagueId === undefined) {
      setLeagueTeams([]);
      setAllLeaguePlayers([]);
      setLoadingTeams(false);
      setErrorTeams(null);
      return;
    }

    setLoadingTeams(true);
    setErrorTeams(null);
    setLeagueTeams([]); // Clear previous teams
    setAllLeaguePlayers([]); // Clear previous players

    fetchTeams(leagueId)
      .then(teams => {
        setLeagueTeams(teams);
        const allPlayers = teams.reduce((acc, team) => {
          team.players.forEach(p => {
            if (!acc.some(ap => ap.name === p.name)) { // Ensure unique players
              acc.push(p);
            }
          });
          return acc;
        }, [] as TeamPlayer[]);
        setAllLeaguePlayers(allPlayers);
      })
      .catch(err => {
        setErrorTeams(err instanceof Error ? err.message : 'Failed to load teams');
        setLeagueTeams([]); // Clear on error
        setAllLeaguePlayers([]); // Clear on error
      })
      .finally(() => {
        setLoadingTeams(false);
      });
  }, [leagueId]);

  return { leagueTeams, allLeaguePlayers, loadingTeams, errorTeams };
}
