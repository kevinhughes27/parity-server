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

// const fetchLeagues = async () => {
//   const response = await cachedFetch(`/api/leagues`)
//   const leagues = await response.json()
//   // nothing to display for league_id=1
//   return leagues.filter((l) => l.id > 1)
// }
const leagues = [
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

const fetchGames = async (league) => {
  const response = await cachedFetch(`/api/${league}/games`)
  return await response.json()
}

const fetchGame = async (gameId, league) => {
  const response = await cachedFetch(`/api/${league}/games/${gameId}`)
  return await response.json()
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
  leagues,
  fetchGames,
  fetchGame,
  fetchPlayers,
  fetchWeeks,
  fetchStats
}
