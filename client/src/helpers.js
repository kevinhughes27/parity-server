import _ from 'lodash'

export function calcSalaryCap(players) {
  const numTeams = 8
  const salaries = _.map(players, (p) => p.salary)
  return _.sum(salaries) / numTeams * 1.01
}

export function calcSalaryFloor(players) {
  const numTeams = 8
  const salaries = _.map(players, (p) => p.salary)
  return _.sum(salaries) / numTeams * 0.99
}
