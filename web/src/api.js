import 'whatwg-fetch'

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

const fetchGames = async () => {
  const response = await cachedFetch('/api/games')
  return await response.json()
}

const fetchGame = async (gameId) => {
  const response = await cachedFetch(`/api/games/${gameId}`)
  return await response.json()
}

const fetchPlayers = async () => {
  const response = await cachedFetch('/api/players')
  return await response.json()
}

const fetchWeeks = async () => {
  const response = await cachedFetch('/api/weeks')
  return await response.json()
}

const fetchStats = async (weekNum) => {
  let url = `/api/weeks/${weekNum}`
  if (weekNum === 0) url = '/api/stats'

  const response = await cachedFetch(url)
  const json = await response.json()
  const data = json.stats || {}
  return data
}

export {
  fetchGames,
  fetchGame,
  fetchPlayers,
  fetchWeeks,
  fetchStats
}
