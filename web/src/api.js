import 'whatwg-fetch'
import ls from 'local-storage'

const leagueKey = 'currentLeague'

const currentLeague = () => {
  return ls.get(leagueKey) || '10'
}

const setLeague = (league) => {
  ls.set(leagueKey, league)
}

const dataCache = {}

const cachedFetch = (url, _options) => {
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

const fetchGames = async (league) => {
  const response = await cachedFetch(`/api/${league}/games`)
  return await response.json()
}

const fetchGame = async (gameId, league) => {
  const response = await cachedFetch(`/api/${league}/games/${gameId}`)
  return await response.json()
}

const fetchLeagues = async () => {
  const response = await cachedFetch(`/api/leagues`)
  const leagues = await response.json()
  // nothing to display for league_id=1
  return leagues.filter((l) => l.id > 1)
}

const fetchPlayers = async (league) => {
  const response = await cachedFetch(`/api/${league}/players`)
  return await response.json()
}

const fetchWeeks = async (league) => {
  const response = await cachedFetch(`/api/${league}/weeks`)
  return await response.json()
}

const fetchStats = async (weekNum, league) => {
  let url = `/api/${league}/weeks/${weekNum}`
  if (weekNum === 0) url = `/api/${league}/stats`

  const response = await cachedFetch(url)
  const json = await response.json()
  const data = json.stats || {}
  return data
}

export {
  currentLeague,
  setLeague,
  fetchGames,
  fetchGame,
  fetchLeagues,
  fetchPlayers,
  fetchWeeks,
  fetchStats
}
