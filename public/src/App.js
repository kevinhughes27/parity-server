import React, { Component } from 'react';
import Stats from './Stats'
import './App.css';

class App extends Component {
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <h2>Parity 2.0</h2>
        </div>
        <p className="App-intro">
          <Stats />
        </p>
      </div>
    );
  }
}

export default App;
