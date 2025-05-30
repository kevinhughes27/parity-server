import createPersistedState from 'use-persisted-state';
import leagues from '../leagues.json';

const currentLeague = leagues[0];
const initialLeague = currentLeague.id.toString();

const storageKey = 'currentLeague';

const useLeagueState = createPersistedState<string>(storageKey);

type UseLeague = [string, (league: string) => void];

export function useLeague(): UseLeague {
  const [league, setLeague] = useLeagueState(initialLeague);
  return [league, setLeague];
}
