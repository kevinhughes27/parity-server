import createPersistedState from 'use-persisted-state'

const storageKey = 'currentLeague';
const initialLeague = '14';

const useLeagueState = createPersistedState(storageKey);

type UseLeague = [
  string,
  (league: string) => void,
]

export function useLeague(): UseLeague {
  const [league, setLeague] = useLeagueState(initialLeague);
  return [league, setLeague];
};
