import 'whatwg-fetch'

const defaultLeague = "10"

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

const fetchGames = async (league = defaultLeague) => {
  const response = await cachedFetch(`/api/${league}/games`)
  return await response.json()
}

const fetchGame = async (gameId, league = defaultLeague) => {
  const response = await cachedFetch(`/api/${league}/games/${gameId}`)
  return await response.json()
}

const fetchLeagues = async (league = defaultLeague) => {
  const response = await cachedFetch(`/api/leagues`)
  return await response.json()
}

const fetchPlayers = async (league = defaultLeague) => {
  const response = await cachedFetch(`/api/${league}/players`)
  return await response.json()
}

const fetchWeeks = async (league = defaultLeague) => {
  const response = await cachedFetch(`/api/${league}/weeks`)
  return await response.json()
}

const fetchStats = async (weekNum, league = defaultLeague) => {
  let url = `/api/${league}/weeks/${weekNum}`
  if (weekNum === 0) url = `/api/${league}/stats`

  const response = await cachedFetch(url)
  const json = await response.json()
  const data = json.stats || {}
  return data
}

export {
  fetchGames,
  fetchGame,
  fetchLeagues,
  fetchPlayers,
  fetchWeeks,
  fetchStats
}
