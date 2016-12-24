import renderer from 'react-test-renderer'
import React from 'react'
import Loader from './Loader'
import StatsTable from './StatsTable'

jest.mock('./Loader')

test('StatsTable renders correctly', () => {
  let week = 1
  let stats = Loader.fetchStats(1)
  const tree = renderer.create(<StatsTable week={week} stats={stats} />).toJSON()
  expect(tree).toMatchSnapshot()
})
