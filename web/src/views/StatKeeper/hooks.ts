import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoredGame } from './db';
import { fetchTeams, Team, TeamPlayer } from '../../api';

export const GAME_LOADING_SENTINEL = Symbol('loading_game_sentinel');

export interface UseLocalGameResult {
  game: StoredGame | undefined; // The resolved game object, or undefined if not found/error
  isLoading: boolean;
  error: string | null;
  numericGameId: number | undefined;
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
      setError('No game ID provided in URL.');
      setNumericGameId(undefined);
      setInternalIsLoading(false);
      return;
    }

    const id = parseInt(paramGameId, 10);
    if (isNaN(id)) {
      setError('Invalid game ID format.');
      setNumericGameId(undefined);
      setInternalIsLoading(false);
    } else {
      setNumericGameId(id);
    }
  }, [paramGameId]);

  // Changed useLiveQuery to 2-argument version
  const rawGameData = useLiveQuery<StoredGame | undefined>(
    async () => {
      if (numericGameId === undefined) {
        // When numericGameId is undefined, we don't want to query.
        // Returning undefined here signals that the query shouldn't run or has no result.
        return undefined;
      }
      // setInternalIsLoading(true); // This might be set here or in the effect below.
      // Dexie-react-hooks handles loading state implicitly.
      return db.games.get(numericGameId);
    },
    [numericGameId] // Dependencies array
    // GAME_LOADING_SENTINEL was the 3rd argument, now removed.
  );

  useEffect(() => {
    // This effect now primarily reacts to changes in numericGameId and rawGameData.
    if (numericGameId === undefined) {
      // If there's no valid numericGameId (e.g., due to URL parsing issues),
      // ensure loading is false and an error might have already been set by the first useEffect.
      setInternalIsLoading(false);
      // Error state is managed by the first useEffect for this case.
      return;
    }

    // At this point, numericGameId is valid.
    // rawGameData will be `undefined` if:
    //   1. The query is still loading.
    //   2. The query has completed and no data was found for numericGameId.
    // rawGameData will be a StoredGame object if data was found.

    if (rawGameData === undefined) {
      // This condition is met both during loading and if the item is not found.
      // We need a way to distinguish. `useLiveQuery` doesn't explicitly give a "loading" boolean for the 2-arg version.
      // We can infer loading if `internalIsLoading` is still true from the `paramGameId` effect,
      // and `rawGameData` is `undefined`.
      // However, if `paramGameId` hasn't changed but the underlying data changes (e.g. DB update),
      // `rawGameData` might become `undefined` if the item is deleted.

      // A common pattern is to assume loading initially, then once rawGameData resolves (even to undefined),
      // it's no longer "initial loading" for that specific numericGameId.
      // The `internalIsLoading` state is set to true when `paramGameId` changes.
      // If `rawGameData` is `undefined` here, it means the query resolved to "not found"
      // or it's the very first render cycle where `useLiveQuery` hasn't populated yet.
      // To simplify, we'll consider `rawGameData === undefined` after the initial load phase as "not found".
      // The `internalIsLoading` flag helps manage the "initial load" state.
      if (internalIsLoading) {
        // Still in the initial loading phase triggered by paramGameId change.
        // Keep isLoading true. useLiveQuery will update rawGameData, and this effect will re-run.
      } else {
        // Not in initial loading phase, and rawGameData is undefined, so it's "not found".
        setError(`Game with ID ${numericGameId} not found.`);
        // isLoading should be false because the query has resolved (to undefined).
      }
      // `internalIsLoading` will be set to false once `rawGameData` is not undefined,
      // or if `numericGameId` itself becomes undefined.
      // If `rawGameData` is `undefined` and `internalIsLoading` is `true`, we are loading.
      // If `rawGameData` is `undefined` and `internalIsLoading` is `false` (set by a previous run of this effect),
      // then it means "not found".

      // Let's refine:
      // If numericGameId is set, and rawGameData is undefined, it could be loading or not found.
      // The hook doesn't give a separate loading flag.
      // We set isLoading to true when numericGameId changes.
      // We set isLoading to false when rawGameData gets a value OR when we determine it's "not found".
      // This means if rawGameData is undefined, we might briefly show loading, then "not found".
      setInternalIsLoading(false); // Assume query resolved, if undefined then it's not found.
      setError(`Game with ID ${numericGameId} not found.`);
    } else {
      // rawGameData is a StoredGame object
      setInternalIsLoading(false);
      setError(null);
    }
  }, [rawGameData, numericGameId, internalIsLoading]); // internalIsLoading in deps to re-evaluate if it changes.

  // rawGameData is StoredGame | undefined. It can no longer be GAME_LOADING_SENTINEL.
  const game = rawGameData ? rawGameData : undefined;

  return {
    game,
    // isLoading should reflect whether we are actively waiting for `useLiveQuery` to resolve
    // for the current `numericGameId`.
    // If `numericGameId` is undefined, we are not loading.
    // If `numericGameId` is defined, and `rawGameData` is undefined, we consider it loading.
    // Once `rawGameData` is defined (either game object or explicit undefined for not found), loading is done.
    // The `internalIsLoading` state tries to capture this.
    isLoading: numericGameId !== undefined && rawGameData === undefined, // A more direct way to express loading
    error,
    numericGameId,
  };
}

export interface UseTeamsResult {
  leagueTeams: Team[];
  allLeaguePlayers: TeamPlayer[];
  loadingTeams: boolean;
  errorTeams: string | null;
}

export function useTeams(leagueId: string | undefined): UseTeamsResult {
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
            if (!acc.some(ap => ap.name === p.name)) {
              // Ensure unique players
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
