import $ from 'jquery';
import _ from 'lodash';
import React, { Component } from 'react';
import Griddle from 'griddle-react';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      week: null
    }
  }

  componentWillMount() {
    $.get('/weeks/1', (result) => {
      this.setState({ week: result, loading: false });
    });
  }

  render() {
    if(this.state.loading) return (
      <div>
        Loading ...
      </div>
    );

    let week = this.state.week;
    let stats = week.stats;
    stats = _.map(_.keys(stats), (k) => {
      return { name: k, ...stats[k] }
    });

    return (
      <div className="App">
        <div className="App-header">
          <h2>Parity 2.0</h2>
        </div>
        <p className="App-intro">
          <Griddle
            results={stats}
            resultsPerPage={stats.length}
            showFilter={true}
            showSettings={true}
          />
        </p>
      </div>
    );
  }
}

export default App;
