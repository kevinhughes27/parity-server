import { map, sum, uniq } from 'lodash'

export function calcSalaryLimits(players) {
  const numTeams = uniq(players.map(p => p.team)).length
  const salaryCapVariance = 0.02
  const salaries = map(players, (p) => p.salary)
  const salaryAvg = sum(salaries) / numTeams;

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

export const underColors = [
  '#bbdefb',
  '#abd3f5',
  '#9cc8f0',
  '#8dbdea',
  '#7eb2e5',
  '#6fa7e0',
  '#609cda',
  '#5191d5',
  '#4286d0',
  '#337bca',
  '#2470c5',
  '#1565c0',
]

export const overColors = [
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
