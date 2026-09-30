// Stats and salaries, computed on demand from raw game events.
//
// Ported from the v2 python server (stats_calculator.py + api.py). The output is
// checked against v2's snapshots and every game recorded in v2 (see __tests__).

import type { Point, StatValues, SalaryCalc, Team } from './types';

export const COUNTING_STATS = [
  'goals',
  'assists',
  'second_assists',
  'd_blocks',
  'completions',
  'throw_aways',
  'threw_drops',
  'catches',
  'drops',
  'pulls',
  'callahan',
  'o_points_for',
  'o_points_against',
  'd_points_for',
  'd_points_against',
] as const;

export type CountingStat = (typeof COUNTING_STATS)[number];
export type Counts = Record<CountingStat, number>;

export interface StatLine extends Counts {
  points_played: number;
  team: string;
  pay: number;
  salary_per_point: number;
  o_efficiency: number;
  d_efficiency: number;
  total_efficiency: number;
}

export const STAT_VALUES: Record<StatValues, Partial<Record<CountingStat, number>>> = {
  v2: {
    goals: 10000,
    assists: 10000,
    second_assists: 8000,
    d_blocks: 8000,
    throw_aways: -5000,
    threw_drops: -1000,
    drops: -4000,
    completions: 500,
    catches: 500,
    o_points_for: 1000,
    d_points_for: 2000,
  },
  v1: {
    goals: 10000,
    assists: 10000,
    second_assists: 8000,
    d_blocks: 8000,
    throw_aways: -5000,
    threw_drops: -2500,
    drops: -5000,
    completions: 1000,
    catches: 1000,
  },
};

// Python's round(): half to even. v2 used it everywhere and we want identical numbers.
export function pyRound(x: number): number {
  if (Math.abs(x % 1) === 0.5) return 2 * Math.round(x / 2);
  return Math.round(x);
}

const emptyCounts = (): Counts => Object.fromEntries(COUNTING_STATS.map(s => [s, 0])) as Counts;

// Count stats for every player in one game.
export function countGame(points: Point[]): Record<string, Counts> {
  const stats: Record<string, Counts> = {};
  const add = (player: string | null | undefined, stat: CountingStat) => {
    if (player == null) return;
    (stats[player] ??= emptyCounts())[stat] += 1;
  };

  for (const { events, offensePlayers, defensePlayers } of points) {
    events.forEach((event, idx) => {
      // python's events[idx - n] wraps around; .at() matches that
      const prev = events.at(idx - 1);
      const prevPrev = events.at(idx - 2);

      switch (event.type) {
        case 'PASS': {
          const next = events[idx + 1];
          if (next && next.type !== 'DROP') {
            add(event.firstActor, 'completions');
            add(event.secondActor, 'catches');
          }
          break;
        }
        case 'DROP':
          add(event.firstActor, 'drops');
          add(prev?.firstActor, 'threw_drops');
          break;
        case 'THROWAWAY':
          add(event.firstActor, 'throw_aways');
          break;
        case 'DEFENSE':
          add(event.firstActor, 'd_blocks');
          break;
        case 'PULL':
          add(event.firstActor, 'pulls');
          break;
        case 'POINT': {
          add(event.firstActor, 'goals');

          if (prev?.type === 'PASS' && prev.secondActor === event.firstActor) {
            add(prev.firstActor, 'assists');
            if (prevPrev?.type === 'PASS') add(prevPrev.firstActor, 'second_assists');
          } else if (prev?.type === 'DEFENSE' || prev?.type === 'DROP') {
            add(event.firstActor, 'callahan');
          }

          if (offensePlayers.includes(event.firstActor)) {
            offensePlayers.forEach(p => add(p, 'o_points_for'));
            defensePlayers.forEach(p => add(p, 'd_points_against'));
          } else {
            offensePlayers.forEach(p => add(p, 'o_points_against'));
            defensePlayers.forEach(p => add(p, 'd_points_for'));
          }
          break;
        }
      }
    });
  }

  return stats;
}

// Derived per-game numbers (v2's computed fields on the Stats model).
function derive(c: Counts, statValues: StatValues) {
  const oPlayed = c.o_points_for + c.o_points_against;
  const dPlayed = c.d_points_for + c.d_points_against;
  const pointsPlayed = oPlayed + dPlayed;

  let pay = 0;
  for (const [stat, value] of Object.entries(STAT_VALUES[statValues])) {
    pay += c[stat as CountingStat] * (value as number);
  }

  return {
    points_played: pointsPlayed,
    pay,
    salary_per_point: pointsPlayed === 0 ? 0 : pyRound(pay / pointsPlayed),
    o_efficiency: oPlayed === 0 ? 0 : c.o_points_for / oPlayed,
    d_efficiency: dPlayed === 0 ? 0 : c.d_points_for / dPlayed,
    total_efficiency: pointsPlayed === 0 ? 0 : (c.o_points_for + c.d_points_for) / pointsPlayed,
  };
}

// The bits of a game needed to roll up stats. Cheap to cache.
export interface GameSummary {
  week: number;
  homeTeam: string;
  awayTeam: string;
  homeRoster: string[];
  awayRoster: string[];
  counts: Record<string, Counts>;
}

export function summarize(game: {
  week: number;
  homeTeam: string;
  awayTeam: string;
  homeRoster: string[];
  awayRoster: string[];
  points: Point[];
}): GameSummary {
  const { week, homeTeam, awayTeam, homeRoster, awayRoster } = game;
  return { week, homeTeam, awayTeam, homeRoster, awayRoster, counts: countGame(game.points) };
}

const AVERAGED = [
  'pay',
  'salary_per_point',
  'o_efficiency',
  'd_efficiency',
  'total_efficiency',
] as const;

// Roll up stats across games. Counts are summed, pay/efficiency are per-game averages.
// `games` must be in play order; a player's team is taken from the last game they played.
export function rollup(
  games: GameSummary[],
  teams: Team[],
  statValues: StatValues
): Record<string, StatLine> {
  const teamOf = new Map<string, string>();
  for (const team of teams) for (const p of team.players) teamOf.set(p.name, team.name);

  const totals: Record<string, StatLine & { games_played: number }> = {};

  for (const game of games) {
    for (const [name, counts] of Object.entries(game.counts)) {
      const line = { ...counts, ...derive(counts, statValues) };
      const existing = totals[name];

      if (existing) {
        for (const key of Object.keys(line) as (keyof typeof line)[]) {
          existing[key] = line[key] + existing[key];
        }
        existing.games_played += 1;
      } else {
        totals[name] = { ...line, team: '', games_played: 1 };
      }

      totals[name].team = game.homeRoster.includes(name)
        ? game.homeTeam
        : game.awayRoster.includes(name)
          ? game.awayTeam
          : (teamOf.get(name) ?? 'Unknown');
    }
  }

  const result: Record<string, StatLine> = {};
  for (const [name, { games_played, ...line }] of Object.entries(totals)) {
    for (const stat of AVERAGED) line[stat] = line[stat] / games_played;
    line.pay = pyRound(line.pay);
    line.salary_per_point = pyRound(line.salary_per_point);
    result[name] = line;
  }
  return result;
}

export interface PlayerSalary {
  name: string;
  team: string;
  salary: number;
}

const PRO_RATE_POINTS = 15;
const SUM_BASE = 500000;

// Salaries for every rostered player. Players without enough data get the
// average salary for their gender.
export function salaries(
  games: GameSummary[],
  teams: Team[],
  statValues: StatValues,
  salaryCalc: SalaryCalc
): PlayerSalary[] {
  // per-game lines for each player
  const perGame = new Map<string, ReturnType<typeof derive>[]>();
  for (const game of games) {
    for (const [name, counts] of Object.entries(game.counts)) {
      const lines = perGame.get(name) ?? [];
      lines.push(derive(counts, statValues));
      perGame.set(name, lines);
    }
  }

  const players = teams.flatMap(team =>
    team.players.map(p => ({ ...p, team: team.name, salary: null as number | null }))
  );

  for (const player of players) {
    const lines = perGame.get(player.name);
    if (!lines) continue;

    if (salaryCalc === 'pro_rate') {
      const perPoint = lines.filter(l => l.points_played > 3).map(l => l.salary_per_point);
      if (perPoint.length === 0) continue;
      const avg = perPoint.reduce((a, b) => a + b, 0) / perPoint.length;
      player.salary = pyRound(avg * PRO_RATE_POINTS);
    } else if (salaryCalc === 'sum') {
      player.salary = SUM_BASE + lines.reduce((total, l) => total + l.pay, 0);
    }
  }

  const average = (xs: number[]) => pyRound(xs.reduce((a, b) => a + b, 0) / (xs.length || 1));
  const openAvg = average(players.filter(p => p.is_open && p.salary).map(p => p.salary!));
  const womenAvg = average(players.filter(p => !p.is_open && p.salary).map(p => p.salary!));

  return players.map(p => ({
    name: p.name,
    team: p.team,
    salary: p.salary ?? (p.is_open ? openAvg : womenAvg),
  }));
}
