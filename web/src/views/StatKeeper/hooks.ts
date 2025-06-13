import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoredGame } from './db';
import { fetchTeams, Team, TeamPlayer, leagues as apiLeagues } from '../../api'; // Added apiLeagues

// GAME_LOADING_SENTINEL is no longer needed with the 2-argument useLiveQuery.
// export const GAME_LOADING_SENTINEL = Symbol('loading_game_sentinel');


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
