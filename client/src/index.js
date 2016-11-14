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

ReactDOM.render(
  <Router history={browserHistory}>
    <Route path="/" component={App}>
      <Route path="/compare_players" component={ComparePlayers} />
      <Route path="/team_dashboard" component={TeamDashboard} />
    </Route>
  </Router>,
  document.getElementById('root')
)
