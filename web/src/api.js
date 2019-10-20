import 'whatwg-fetch'

const fetchGames = async () => {
  const response = await fetch('/api/games')
  return await response.json()
}

const fetchGame = async (gameId) => {
  const response = await fetch(`/api/games/${gameId}`)
  return await response.json()
}

const fetchPlayers = async () => {
  const response = await fetch('/api/players')
  return await response.json()
}

const fetchWeeks = async () => {
  const response = await fetch('/api/weeks')
  return await response.json()
}

const fetchStats = async (weekNum) => {
  let url = `/api/weeks/${weekNum}`
  if (weekNum === 0) url = '/api/stats'

  const response = await fetch(url)
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
