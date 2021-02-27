import { map, sum, uniq } from 'lodash'

interface IPlayer {
  name: string;
  team: string;
  salary: number;
}

export function calcSalaryLimits(players: IPlayer[]) {
  const numTeams = uniq(players.map(p => p.team)).length
  const salaryCapVariance = 0.02
  const salaries = map(players,
     (p) => p.salary)
  const salaryAvg = sum(salaries) / numTeams;

  return {
    salaryCap: salaryAvg * (1 + salaryCapVariance),
    salaryFloor: salaryAvg * (1 - salaryCapVariance),
  }
}

// hex gradient maker:
// https://www.strangeplanet.fr/work/gradient-generator/index.php

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

export const homeColors = [
  "#90CAF9",
  "#84BEF1",
  "#78B2E9",
  "#6CA6E1",
  "#609AD9",
  "#548ED1",
  "#4882C9",
  "#3C76C1",
  "#306AB9",
  "#245EB1",
  "#1852A9",
  "#0D47A1"
]

export const awayColors = [
  "#FFCC80",
  "#FDC374",
  "#FCBA68",
  "#FAB15D",
  "#F9A951",
  "#F7A045",
  "#F6973A",
  "#F48E2E",
  "#F38622",
  "#F17D17",
  "#F0740B",
  "#EF6C00"
]
