import React from 'react'
import { Router, Route } from 'react-router'
import { createBrowserHistory } from 'history';

import GamesList from './Components/GamesList'
import Game from './Components/Game'

import StatsPage from './Components/StatsPage'
import Leaderboards from './Components/Leaderboards'
import ComparePlayers from './Components/ComparePlayers'

import SalaryPage from './Components/SalaryPage'
import TeamDashboard from './Components/TeamDashboard'
import TradeSimulator from './Components/TradeSimulator'

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
        <Route path="/games/:gameId" component={Game} />

        <Route exact path="/" component={StatsPage} />

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
