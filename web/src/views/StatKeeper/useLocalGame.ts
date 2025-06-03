import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoredGame } from './db';

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
    // If numericGameId is undefined, it means paramGameId was missing or invalid.
    // The first useEffect already set an error and internalIsLoading = false.
    // The useLiveQuery is essentially a no-op or returns undefined in this case.
    if (numericGameId === undefined) {
      // Ensure isLoading is false if it somehow got true, though the first effect should handle it.
      setInternalIsLoading(false);
      return;
    }

    // At this point, numericGameId is valid.
    // The first useEffect would have set error to null and internalIsLoading to true.
    if (rawGameData === GAME_LOADING_SENTINEL) {
      setInternalIsLoading(true);
      // setError(null); // Error is already reset by the first useEffect when paramGameId changes.
                       // No need to reset it again here while actively loading.
    } else if (rawGameData !== undefined) { // Game data is available and is the actual game object
      setInternalIsLoading(false);
      setError(null); // Game found, clear any "not found" error from a previous state.
    } else { // rawGameData is undefined (and not the sentinel), meaning query completed and found nothing
      setInternalIsLoading(false);
      // Set "not found" error. This check ensures we don't overwrite an error from
      // the first useEffect (e.g. "Invalid game ID format") if numericGameId was
      // somehow defined but an error was already set. However, the primary guard
      // for param parsing errors is numericGameId being undefined.
      // If error is already set (e.g. from first useEffect), this won't clear it,
      // which is correct. If error is null, this will set the "not found" error.
      // This specific path (numericId is defined, rawGameData is undefined) implies
      // a "not found" scenario for a valid ID format.
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
