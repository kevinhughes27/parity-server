import renderer from 'react-test-renderer'
import React from 'react'
import App from './App'

// stub jquery + materialize.js
import $ from 'jquery'
window.$ = $
$.fn.dropdown = function (options) { }
$.fn.sideNav = function () { }

jest.mock('./Loader')

test('App renders correctly', () => {
  const tree = renderer.create(<App />).toJSON()
  expect(tree).toMatchSnapshot()
})
