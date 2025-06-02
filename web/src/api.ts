import 'whatwg-fetch';
import leagues from './leagues.json';

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
  type: string;
  firstActor: string;
  secondActor: string;
  timestamp: string;
}

const fetchGames = async (leagueId: string): Promise<Game[]> => {
  const response = await cachedFetch(`/api/${leagueId}/games`);
  return await response.json();
};

const fetchGame = async (gameId: string, leagueId: string): Promise<Game> => {
  const response = await cachedFetch(`/api/${leagueId}/games/${gameId}`);
  return await response.json();
};

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

// New interfaces for /api/:leagueId/teams endpoint
export interface TeamPlayer {
  name: string;
  team: string; // Original team, useful for context if they are a sub
  is_male: boolean;
}

export interface LeagueTeam {
  id: number; // Team ID
  name: string;
  players: TeamPlayer[];
}

const fetchLeagueTeams = async (leagueId: string): Promise<LeagueTeam[]> => {
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

export {
  leagues,
  fetchGames,
  fetchGame,
  fetchLeagueTeams, // Export new function
  fetchPlayers,
  fetchWeeks,
  fetchStats,
  saveGame,
  deleteGame,
};
