import Stats from '../Stores/Stats'

const loader = jest.genMockFromModule('../Loader')

let fetchWeeks = function () {
  return [1, 2, 3]
}

let fetchStats = function (weekNum: number) {
  let data = {
    'Kevin Hughes': {
      'Goals': 2,
      'Assists': 1,
      '2nd Assist': 1,
      '3rd Assist': 3,
      '4th Assist': 1,
      '5th Assist': 1,
      'D-Blocks': 1,
      'Completions': 19,
      'Throwaways': 1,
      'ThrewDrop': 0,
      'Catches': 17,
      'Drops': 0,
      'Pick-Ups': 5,
      'Pulls': 0,
      'Calihan': 0,
      'OPointsFor': 5,
      'OPointsAgainst': 5,
      'DPointsFor': 5,
      'DPointsAgainst': 7,
      'Team': 'Like a Boss',
      'SalaryDelta': 77000,
      'Salary': 1071666
    }
  }

  return new Stats(data)
}

loader.fetchWeeks = fetchWeeks
loader.fetchStats = fetchStats

module.exports = loader
