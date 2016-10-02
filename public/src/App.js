import React, { Component } from 'react';
import Stats from './Stats';

class App extends Component {
  render() {
    return (
      <div>
        <nav>
          <div className="nav-wrapper">
            <a href="#" className="brand-logo center">Parity 2.0</a>
          </div>
        </nav>
        <div className="container">
          <Stats />
        </div>
      </div>
    );
  }
}

export default App;
