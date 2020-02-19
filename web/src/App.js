import React from 'react'
import { Router, Route } from 'react-router'
import { createBrowserHistory } from 'history';

import GamesList from './views/GamesList'
import Game from './views/Game'

import StatsPage from './views/StatsPage'
import Graphs from './views/Graphs'
import Leaderboards from './views/Leaderboards'

import SalaryPage from './views/SalaryPage'
import StatsTable from './views/StatsTable'
import TeamDashboard from './views/TeamDashboard'

import ReactGA from 'react-ga'
ReactGA.initialize('UA-87669001-1')

const history = createBrowserHistory();

history.listen((location) => {
  if (window.location.hostname !== 'localhost') {
    ReactGA.set({ page: location.pathname })
    ReactGA.pageview(location.pathname)
  }
})

class App extends React.Component {
  render() {
    return (
      <Router history={history}>
        <Route exact path="/games" component={GamesList} />
        <Route path="/:leagueId/games/:gameId" component={Game} />

        <Route exact path="/" >
          <StatsPage>
            <StatsTable />
          </StatsPage>
        </Route>

        <Route path="/graphs">
          <StatsPage>
            <Graphs />
          </StatsPage>
        </Route>

        <Route path="/leaderboards">
          <StatsPage>
            <Leaderboards />
          </StatsPage>
        </Route>

        <Route path="/team_dashboard">
          <SalaryPage>
            <TeamDashboard />
          </SalaryPage>
        </Route>
      </Router>
    )
  }
}

export default App
