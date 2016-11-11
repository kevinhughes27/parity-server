// @flow

import React from 'react'
import ReactDOM from 'react-dom'
import { browserHistory, Router, Route } from 'react-router'

import App from './App'
import ComparePlayers from './ComparePlayers'
import CompareTeams from './CompareTeams'

import './index.css'
import 'materialize-css/dist/css/materialize.css'

ReactDOM.render(
  <Router history={browserHistory}>
    <Route path="/" component={App}>
      <Route path="/compare_players" component={ComparePlayers} />
      <Route path="/compare_teams" component={CompareTeams} />
    </Route>
  </Router>,
  document.getElementById('root')
)
