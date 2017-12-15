import React from 'react'
import { browserHistory, Router, Route } from 'react-router'

import GamesList from './Components/GamesList'
import Game from './Components/Game'

import StatsPage from './Components/StatsPage'
import Leaderboards from './Components/Leaderboards'
import ComparePlayers from './Components/ComparePlayers'
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

class App extends React.Component {
  render() {
    return (
      <Router history={browserHistory} onUpdate={logPageView}>
        <Route path="/games" component={GamesList} />
        <Route path="/games/:gameId" component={Game} />
        <Route path="/" component={StatsPage}>
          <Route path="/leaderboards" component={Leaderboards} />
          <Route path="/compare_players" component={ComparePlayers} />
        </Route>
        <Route path="/team_dashboard" component={TeamDashboard} />
        <Route path="/trade_simulator" component={TradeSimulator} />
      </Router>
    )
  }
}

export default App
