// @flow

import React from 'react'
import ReactDOM from 'react-dom'
import { browserHistory, Router, Route } from 'react-router'

import App from './Components/App'

import Leaderboards from './Components/Leaderboards'
import ComparePlayers from './Components/ComparePlayers'
import TeamDashboard from './Components/TeamDashboard'
import TradeSimulator from './Components/TradeSimulator'

import 'materialize-css/dist/css/materialize.css'
import './index.css'

import ReactGA from 'react-ga'
ReactGA.initialize('UA-87669001-1')

function logPageView () {
  if (window.location.hostname !== 'localhost') {
    ReactGA.set({ page: window.location.pathname })
    ReactGA.pageview(window.location.pathname)
  }
}

ReactDOM.render(
  <Router history={browserHistory} onUpdate={logPageView}>
    <Route path="/" component={App}>
      <Route path="/leaderboards" component={Leaderboards} />
      <Route path="/compare_players" component={ComparePlayers} />
      <Route path="/team_dashboard" component={TeamDashboard} />
      <Route path="/trade_simulator" component={TradeSimulator} />
    </Route>
  </Router>,
  document.getElementById('root')
)
