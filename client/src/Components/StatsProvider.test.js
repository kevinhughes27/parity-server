import renderer from 'react-test-renderer'
import React from 'react'
import StatsProvider from './StatsProvider'

// stub jquery + materialize.js
import $ from 'jquery'
window.$ = $
$.fn.dropdown = function (options) { }
$.fn.sideNav = function () { }

jest.mock('../Loader')

test('StatsProvider renders correctly', () => {
  const tree = renderer.create(<StatsProvider />).toJSON()
  expect(tree).toMatchSnapshot()
})
