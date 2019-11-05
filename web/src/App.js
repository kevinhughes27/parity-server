import React from 'react'
import { Router, Route } from 'react-router'
import { createBrowserHistory } from 'history';

import GamesList from './views/GamesList'
import Game from './views/Game'

import StatsPage from './views/StatsPage'
import Leaderboards from './views/Leaderboards'
import ComparePlayers from './views/ComparePlayers'

import SalaryPage from './views/SalaryPage'
import StatsTable from './views/StatsTable'
import TeamDashboard from './views/TeamDashboard'
import TradeSimulator from './views/TradeSimulator'

import ReactGA from 'react-ga'
ReactGA.initialize('UA-87669001-1')

function logPageView () {
  if (window.location.hostname !== 'localhost') {
    ReactGA.set({ page: window.location.pathname })
    ReactGA.pageview(window.location.pathname)
  }
}

const browserHistory = createBrowserHistory();

class App extends React.Component {
  render() {
    return (
      <Router history={browserHistory} onUpdate={logPageView}>
        <Route exact path="/games" component={GamesList} />
        <Route path="/:leagueId/games/:gameId" component={Game} />

        <Route exact path="/" >
          <StatsPage>
            <StatsTable />
          </StatsPage>
        </Route>

        <Route path="/leaderboards">
          <StatsPage>
            <Leaderboards />
          </StatsPage>
        </Route>

        <Route path="/compare_players">
          <StatsPage>
            <ComparePlayers />
          </StatsPage>
        </Route>

        <Route path="/team_dashboard">
          <SalaryPage>
            <TeamDashboard />
          </SalaryPage>
        </Route>

        <Route path="/trade_simulator">
          <SalaryPage>
            <TradeSimulator />
          </SalaryPage>
        </Route>
      </Router>
    )
  }
}

export default App
