import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

window.$ = require('jquery');
$.fn.dropdown = function (options) { };

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);
});
