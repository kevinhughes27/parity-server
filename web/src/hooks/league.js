import createPersistedState from 'use-persisted-state'

const storageKey = 'currentLeague';
const initialLeague = '14';

const useLeagueState = createPersistedState(storageKey);

export function useLeague() {
  const [league, setLeague] = useLeagueState(initialLeague);
  return [league, setLeague];
};
