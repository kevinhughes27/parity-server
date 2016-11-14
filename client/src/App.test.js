// stub materialize
import $ from 'jquery'
window.$ = $
$.fn.dropdown = function (options) { }
$.fn.sideNav = function () { }

import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

jest.mock('browser-request')

it('renders without crashing', () => {
  const div = document.createElement('div')
  ReactDOM.render(<App />, div)
})
