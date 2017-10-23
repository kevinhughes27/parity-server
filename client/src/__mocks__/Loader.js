import Stats from '../Stores/Stats'

const loader = jest.genMockFromModule('../Loader')

let fetchWeeks = function () {
  return [1, 2, 3]
}

let fetchStats = function (weekNum: number) {
  let data = {
    'Kevin Hughes': {
      'goals': 2,
      'assists': 1,
      'second_assists': 1,
      'd_blocks': 1,
      'completions': 19,
      'throw_aways': 1,
      'threw_drops': 0,
      'catches': 17,
      'drops': 0,
      'pulls': 0,
      'callahan': 0,
      'o_points_for': 5,
      'o_points_against': 5,
      'd_points_for': 5,
      'd_points_against': 7,
      'team': 'Like a Boss',
      'salaryDelta': 77000,
      'salary': 1071666
    }
  }

  return new Stats(data)
}

loader.fetchWeeks = fetchWeeks
loader.fetchStats = fetchStats

module.exports = loader
