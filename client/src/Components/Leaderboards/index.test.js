import renderer from 'react-test-renderer'
import React from 'react'
import Loader from '../../Loader'
import Leaderboards from '.'

jest.mock('../../Loader')

test('Leaderboards renders correctly', () => {
  let week = 1
  let stats = Loader.fetchStats(1)
  const tree = renderer.create(<Leaderboards week={week} stats={stats} />).toJSON()
  expect(tree).toMatchSnapshot()
})
