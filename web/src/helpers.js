import _ from 'lodash'

export function calcSalaryLimits(players) {
  const numTeams = 10
  const salaryCapVariance = 0.02
  const salaries = _.map(players, (p) => p.salary)
  const salaryAvg = _.sum(salaries) / numTeams;
  
  return {
    salaryCap: salaryAvg * (1 + salaryCapVariance),
    salaryFloor: salaryAvg * (1 - salaryCapVariance),
  }
}

export const colors = [
  '#C8E6C9',
  '#BDE0BE',
  '#B2DAB3',
  '#A7D4A8',
  '#9CCF9E',
  '#91C993',
  '#85C388',
  '#7ABD7D',
  '#6FB772',
  '#64B168',
  '#59AC5D',
  '#4EA652',
  '#43A047'
]

export const warnColors = [
  '#FFF9C4',
  '#FFF6B8',
  '#FFF4AC',
  '#FEF1A0',
  '#FEEE94',
  '#FEEB88',
  '#FEE87D',
  '#FEE671',
  '#FEE365',
  '#FDE059',
  '#FDDE4D',
  '#FDDB41',
  '#FDD835'
]

export const dangerColors = [
  '#FFCDD2',
  '#FDC1C5',
  '#FBB4B8',
  '#F8A8AB',
  '#F69C9E',
  '#F48F91',
  '#F28384',
  '#F07776',
  '#EE6A69',
  '#EB5E5C',
  '#E9524F',
  '#E74542',
  '#E53935'
]
