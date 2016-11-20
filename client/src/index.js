// @flow

import React from 'react'
import ReactDOM from 'react-dom'
import { browserHistory, Router, Route } from 'react-router'

import App from './App'
import ComparePlayers from './ComparePlayers'
import TeamDashboard from './TeamDashboard'

import 'materialize-css/dist/css/materialize.css'
import './index.css'
import './compare-players.css'
import './team-dashboard.css'

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
      <Route path="/compare_players" component={ComparePlayers} />
      <Route path="/team_dashboard" component={TeamDashboard} />
    </Route>
  </Router>,
  document.getElementById('root')
)
