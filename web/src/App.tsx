import React from 'react'
import { BrowserRouter, Switch, Route } from 'react-router-dom'

import GamesList from './views/GamesList'
import Game from './views/Game'

import StatsPage from './views/StatsPage'
import Leaderboards from './views/Leaderboards'
import ComparePlayers from './views/ComparePlayers'

import SalaryPage from './views/SalaryPage'
import StatsTable from './views/StatsTable'
import TeamDashboard from './views/TeamDashboard'

import useGoogleAnalytics from './hooks/analytics'

function Routes() {
  useGoogleAnalytics()

  return (
    <Switch>
      <Route exact path="/games" component={GamesList} />
      <Route path="/:leagueId/games/:gameId" component={Game} />

      <Route exact path="/" >
        <StatsPage component={StatsTable} />
      </Route>

      <Route path="/leaderboards">
        <StatsPage component={Leaderboards} />
      </Route>

      <Route path="/compare_players">
        <StatsPage component={ComparePlayers}/>
      </Route>

      <Route path="/team_dashboard">
        <SalaryPage component={TeamDashboard} />
      </Route>
    </Switch>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes />
    </BrowserRouter>
  );
}

export default App
