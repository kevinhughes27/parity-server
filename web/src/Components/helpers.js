import _ from 'lodash'

export function calcSalaryCap(players) {
  const numTeams = 10
  const salaryCapVariance = 0.02
  const salaries = _.map(players, (p) => p.salary)
  return _.sum(salaries) / numTeams * (1 + salaryCapVariance)
}

export function calcSalaryFloor(players) {
  const numTeams = 10
  const salaryCapVariance = 0.02
  const salaries = _.map(players, (p) => p.salary)
  return _.sum(salaries) / numTeams * (1 - salaryCapVariance)
}

export const colors = [
  '#E5F5E0',
  '#D7EDD4',
  '#C9E5C9',
  '#BBDEBE',
  '#ADD6B3',
  '#9FCFA8',
  '#91C79D',
  '#84C092',
  '#76B887',
  '#68B07C',
  '#5AA971',
  '#4CA166',
  '#3E9A5B',
  '#309250',
  '#238B45'
]

export const warnColors = [
  '#FFF9C4',
  '#FEF6B9',
  '#FEF4AF',
  '#FEF1A5',
  '#FEEF9B',
  '#FEED90',
  '#FEEA86',
  '#FEE87C',
  '#FDE672',
  '#FDE368',
  '#FDE15D',
  '#FDDF53',
  '#FDDC49',
  '#FDDA3F',
  '#FDD835'
]
