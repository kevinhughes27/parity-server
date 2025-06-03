import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoredGame } from './db';

// A unique sentinel value to represent the loading state for useLiveQuery's defaultValue
export const GAME_LOADING_SENTINEL = Symbol("loading_game_sentinel");

export interface UseLocalGameLoaderResult {
  game: StoredGame | undefined; // The resolved game object, or undefined if not found/error
  isLoading: boolean;
  error: string | null;
  numericGameId: number | undefined;
  rawGameData: StoredGame | undefined | typeof GAME_LOADING_SENTINEL; // Raw output from useLiveQuery, useful for useEffect dependencies
}

export function useLocalGameLoader(): UseLocalGameLoaderResult {
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
        // If numericGameId is not set (due to parsing error or no param),
        // useLiveQuery shouldn't run or should return a non-game value.
        return undefined;
      }
      // Dexie's get() returns undefined if not found, or the object if found.
      // useLiveQuery will return the sentinel initially, then the result.
      return db.games.get(numericGameId);
    },
    [numericGameId], // Dependency: only re-query if numericGameId changes
    GAME_LOADING_SENTINEL // Initial value while the async function is executing
  );

  useEffect(() => {
    // This effect determines the final isLoading state and sets "not found" error.
    if (numericGameId === undefined && !error) {
      // Error related to ID parsing is already set by the first useEffect.
      // This handles cases where paramGameId might be undefined initially.
      setInternalIsLoading(false);
      return;
    }

    if (rawGameData === GAME_LOADING_SENTINEL && numericGameId !== undefined && !error) {
      setInternalIsLoading(true);
    } else {
      setInternalIsLoading(false);
      if (numericGameId !== undefined && !error && rawGameData === undefined) {
        // ID was valid, query ran, but no game was found
        setError(`Game with ID ${numericGameId} not found.`);
      }
    }
  }, [rawGameData, numericGameId, error]);

  const game = (rawGameData && rawGameData !== GAME_LOADING_SENTINEL) ? (rawGameData as StoredGame) : undefined;

  return {
    game,
    isLoading: internalIsLoading,
    error,
    numericGameId,
    rawGameData,
  };
}
