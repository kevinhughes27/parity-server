import 'whatwg-fetch'

const league = "ocua_18-19"

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
  const response = await cachedFetch(`/api/${league}/games`)
  return await response.json()
}

const fetchGame = async (gameId) => {
  const response = await cachedFetch(`/api/${league}/games/${gameId}`)
  return await response.json()
}

const fetchPlayers = async () => {
  const response = await cachedFetch(`/api/${league}/players`)
  return await response.json()
}

const fetchWeeks = async () => {
  const response = await cachedFetch(`/api/${league}/weeks`)
  return await response.json()
}

const fetchStats = async (weekNum) => {
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
  fetchPlayers,
  fetchWeeks,
  fetchStats
}
