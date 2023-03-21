import 'whatwg-fetch'

interface IDataCache {
  [key: string]: string;
}

const dataCache: IDataCache = {}

const cachedFetch = (url: string, _options = {}) => {
  const cacheKey = url

  const cached = dataCache[cacheKey]

  // return the cache if possible
  if (cached !== undefined) {
    const response = new Response(new Blob([cached]))
    return Promise.resolve(response)
  }

  return fetch(url).then(response => {
    // cache the response
    if (response.status === 200) {
      response.clone().text().then((content) => {
        dataCache[cacheKey] = content
      })
    }
    return response
  })
}

// const fetchLeagues = async () => {
//   const response = await cachedFetch(`/api/leagues`)
//   const leagues = await response.json()
//   // nothing to display for league_id=1
//   return leagues.filter((l) => l.id > 1)
// }
const leagues = [
  { id: 18, name: "2023 Spring Indoor Sunday Parity League"},
  { id: 17, name: "2022 Winter Indoor Sunday Parity League"},
  { id: 16, name: "2021/2022 Session 2"},
  { id: 15, name: "2021/2022 Session 1"},
  { id: 14, name: "2021 Session 3"},
  { id: 13, name: "2020/2021 Session 1" },
  { id: 12, name: "2019/2020 Session 2" },
  { id: 10, name: "2019/2020 Session 1" },
  { id: 9, name: "2018/2019 Session 2" },
  { id: 8, name: "2018/2019 Session 1" },
  { id: 7, name: "2017/2018 Session 2" },
  { id: 6, name: "2017/2018 Session 1" },
  { id: 5, name: "2016/2017 Session 2" },
  { id: 4, name: "2016/2017 Session 1" },
  { id: 3, name: "2015/2016 Winter" },
  { id: 2, name: "2014/2015 Winter", }
]

export interface Game {
  id: string;
  league_id: string;
  week: number;
  homeTeam: string;
  homeScore: number;
  homeRoster: [string];
  awayTeam: string;
  awayScore: number;
  awayRoster: [string];
  points: Point[];
  stats: Stats|undefined;
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
  const response = await cachedFetch(`/api/${leagueId}/games`)
  return await response.json()
}

const fetchGame = async (gameId: string, leagueId: string): Promise<Game> => {
  const response = await cachedFetch(`/api/${leagueId}/games/${gameId}`)
  return await response.json()
}

const saveGame = async (gameId: string, leagueId: string, json: string, password: string|null) => {
  const url = `/api/${leagueId}/games/${gameId}`

  // clear cache
  delete dataCache[url]

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `${password}`
    },
    body: json
  })
}

export interface Player {
  name: string;
  team: string;
  salary: number;
}

const fetchPlayers = async (leagueId: string): Promise<Player[]> => {
  const response = await cachedFetch(`/api/${leagueId}/players`)
  return await response.json()
}

const fetchWeeks = async (leagueId: string): Promise<number[]> => {
  const response = await cachedFetch(`/api/${leagueId}/weeks`)
  return await response.json()
}

export interface Stats {
  [key: string]: StatLine
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
  let url = `/api/${leagueId}/weeks/${weekNum}`
  if (weekNum === 0) url = `/api/${leagueId}/stats`

  const response = await cachedFetch(url)
  const json = await response.json()
  const data = json.stats || {}
  return data
}

export {
  leagues,
  fetchGames,
  fetchGame,
  fetchPlayers,
  fetchWeeks,
  fetchStats,
  saveGame
}
