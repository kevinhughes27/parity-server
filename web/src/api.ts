import 'whatwg-fetch';
import rawLeagues from './leagues.json'; // Renamed to rawLeagues to avoid conflict

// Define an explicit interface for a League object from leagues.json
export interface LeagueFromJson {
  id: string;
  name: string;
  lineSize: number;
  // Add other properties that exist in your leagues.json entries if needed
}

// Type the imported leagues data and sort by numeric id
export const leagues: LeagueFromJson[] = (rawLeagues as LeagueFromJson[]).sort((a, b) => 
  parseInt(a.id) - parseInt(b.id)
);

const getLeagueName = (leagueId: string): string => {
  const league = leagues.find(l => l.id === leagueId);
  return league ? league.name : `Unknown League (${leagueId})`;
};

interface IDataCache {
  [key: string]: string;
}

const dataCache: IDataCache = {};

const cachedFetch = (url: string, _options = {}) => {
  const cacheKey = url;

  const cached = dataCache[cacheKey];

  // return the cache if possible
  if (cached !== undefined) {
    const response = new Response(new Blob([cached]));
    return Promise.resolve(response);
  }

  return fetch(url).then(response => {
    // cache the response
    if (response.status === 200) {
      response
        .clone()
        .text()
        .then(content => {
          dataCache[cacheKey] = content;
        });
    }
    return response;
  });
};

// to save an API call round trip to get the leagues instead we
// generate the json at build time. see `generate` in package.json
//
// const fetchLeagues = async () => {
//   const response = await cachedFetch(`/api/leagues`)
//   const leagues = await response.json()
//   // nothing to display for league_id=1
//   return leagues.filter((l) => l.id > 1)
// }

export interface Game {
  id: string;
  league_id: string;
  week: number;
  homeTeam: string;
  homeScore: number;
  homeRoster: string[];
  awayTeam: string;
  awayScore: number;
  awayRoster: string[];
  points: Point[];
  stats: Stats | undefined;
}

export interface Point {
  offensePlayers: string[];
  defensePlayers: string[];
  events: PointEvent[];
}

export interface PointEvent {
  type: string; // Event types are strings here, e.g., "PASS", "PULL"
  firstActor: string;
  secondActor: string; // Ensure this is not optional if API always provides it, or handle null/undefined
  timestamp: string;
}

// Payload for the /submit_game endpoint
export interface UploadedGamePayload {
  league_id: string; // API spec shows number, but our current data is string. API should handle.
  week: number;
  homeTeam: string;
  awayTeam: string;
  homeRoster: string[];
  awayRoster: string[];
  points: Point[];
  homeScore: number;
  awayScore: number;
}

const fetchGames = async (leagueId: string): Promise<Game[]> => {
  const response = await cachedFetch(`/api/${leagueId}/games`);
  return await response.json();
};

const fetchGame = async (gameId: string, leagueId: string): Promise<Game> => {
  const response = await cachedFetch(`/api/${leagueId}/games/${gameId}`);
  return await response.json();
};

// This function is for the admin-like save endpoint, password protected
const saveGame = async (
  gameId: string,
  leagueId: string,
  json: string,
  password: string | null
) => {
  const url = `/api/${leagueId}/games/${gameId}`;

  // clear cache
  delete dataCache[url];

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${password}`,
    },
    body: json,
  });
};

// New function for the /submit_game endpoint
const uploadCompleteGame = async (payload: UploadedGamePayload) => {
  const url = `/submit_game`; // Top-level endpoint

  // No cache clearing needed here as it's a one-time submission endpoint typically
  // and doesn't usually have a corresponding GET to cache.

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // No Authorization header as per new requirement
    },
    body: JSON.stringify(payload),
  });
};

const deleteGame = async (gameId: string, leagueId: string, password: string | null) => {
  const url = `/api/${leagueId}/games/${gameId}`;

  // clear cache
  delete dataCache[url];

  return fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${password}`,
    },
  });
};

export interface Player {
  name: string;
  team: string;
  salary: number;
}

export interface TeamPlayer {
  name: string;
  team: string;
  is_male: boolean;
}

export interface Team {
  id: number;
  name: string;
  players: TeamPlayer[];
}

const fetchTeams = async (leagueId: string): Promise<Team[]> => {
  const response = await cachedFetch(`/api/${leagueId}/teams`);
  if (!response.ok) {
    throw new Error(`Failed to fetch teams for league ${leagueId}: ${response.statusText}`);
  }
  return await response.json();
};

const fetchPlayers = async (leagueId: string): Promise<Player[]> => {
  const response = await cachedFetch(`/api/${leagueId}/players`);
  return await response.json();
};

const fetchWeeks = async (leagueId: string): Promise<number[]> => {
  const response = await cachedFetch(`/api/${leagueId}/weeks`);
  return await response.json();
};

export interface CurrentLeagueResponse {
  league: {
    id: string;
    zuluru_id: number;
    name: string;
    lineSize: number;
  }
}

export interface Stats {
  [key: string]: StatLine;
}

export interface StatLine {
  name: string;
  team: string;
  goals: number;
  assists: number;
  second_assists: number;
  d_blocks: number;
  catches: number;
  completions: number;
  throw_aways: number;
  threw_drops: number;
  o_points_for: number;
  o_points_against: number;
  d_points_for: number;
  d_points_against: number;
  pay: number;

  // index
  [key: string]: number | string;
}

const fetchStats = async (weekNum: number, leagueId: string): Promise<Stats> => {
  let url = `/api/${leagueId}/weeks/${weekNum}`;
  if (weekNum === 0) url = `/api/${leagueId}/stats`;

  const response = await cachedFetch(url);
  const json = await response.json();
  const data = json.stats || {};
  return data;
};

const fetchCurrentLeague = async (): Promise<CurrentLeagueResponse> => {
  const response = await cachedFetch('/current_league');
  return await response.json();
};

export {
  // leagues is already exported above with its new type
  getLeagueName,
  fetchGames,
  fetchGame,
  fetchTeams,
  fetchPlayers,
  fetchWeeks,
  fetchStats,
  saveGame, // Keep existing saveGame for other uses
  uploadCompleteGame, // New function for game submission
  deleteGame,
  fetchCurrentLeague, // New function to fetch current league
};
