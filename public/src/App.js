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
        <div className="container" style={{height: '100%', minHeight: '100%'}}>
          <Stats week={1}/>
        </div>
      </div>
    );
  }
}

export default App;
