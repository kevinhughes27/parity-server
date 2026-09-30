import { describe, expect, it } from 'vitest';
import { pyRound, rollup, salaries, summarize } from '../stats';
import type { Point, Team } from '../types';
import snapshots from './fixtures/v2_snapshots.json';
import rosters from './fixtures/rosters.json';

// Games recorded by the stat keeper, taken from the v2 python test suite.
const fixtures = import.meta.glob<{
  week: number;
  homeTeam: string;
  awayTeam: string;
  homeRoster: string[];
  awayRoster: string[];
  points: Point[];
}>('./fixtures/*.json', { eager: true, import: 'default' });

const game = (name: string) => fixtures[`./fixtures/${name}.json`];

const rosterTeams: Team[] = Object.entries(rosters).map(([name, players], id) => ({
  id,
  name,
  players: players.map(p => ({ name: p, is_open: true })),
}));

// v2 tests uploaded a single game then fetched /stats
describe('matches v2 snapshots', () => {
  const cases: [snapshot: keyof typeof snapshots, fixture: string, teams: Team[]][] = [
    ['test_basic_point', 'basic_point', rosterTeams],
    ['test_callahan', 'callahan', []],
    ['test_catch_d', 'catch_d', []],
    ['test_drop', 'drop', []],
    ['test_half', 'half', []],
    ['test_mini_game', 'mini_game', []],
    ['test_mini_game2', 'mini_game2', []],
    ['test_throw_away', 'throw_away', []],
    ['test_turnovers', 'turnovers', []],
    // v2 test_edit: mini_game edited by an admin
    ['test_edit', 'mini_game_edited', rosterTeams],
  ];

  it.each(cases)('%s', (snapshot, fixture, teams) => {
    const stats = rollup([summarize(game(fixture))], teams, 'v2');
    expect(stats).toEqual(snapshots[snapshot].stats);
  });
});

describe('rollup', () => {
  it('sums counts and averages per game stats across games', () => {
    const summary = summarize(game('mini_game'));
    const one = rollup([summary], [], 'v2');
    const two = rollup([summary, { ...summary, week: 2 }], [], 'v2');

    for (const [name, line] of Object.entries(one)) {
      expect(two[name].goals).toBe(line.goals * 2);
      expect(two[name].points_played).toBe(line.points_played * 2);
      expect(two[name].pay).toBe(line.pay);
      expect(two[name].o_efficiency).toBe(line.o_efficiency);
    }
  });

  it('takes team from game rosters, then team rosters, else Unknown', () => {
    const summary = { ...summarize(game('mini_game')), homeRoster: [], awayRoster: [] };
    const stats = rollup([summary], rosterTeams.slice(0, 1), 'v2');
    expect(stats['Brian Kells'].team).toBe('Kells Angels Bicycle Club');
    expect(stats['Brent Burton'].team).toBe('Unknown');
  });
});

describe('salaries', () => {
  // no fixture has anyone playing > 3 points (needed for pro rating) so play mini_game twice
  const mini = game('mini_game');
  const games = [summarize({ ...mini, points: [...mini.points, ...mini.points] })];
  const lines = rollup(games, [], 'v2');
  const regulars = Object.keys(lines).filter(n => lines[n].points_played > 3);

  it('has regulars to test with', () => expect(regulars.length).toBeGreaterThan(1));

  const team = (players: Team['players']): Team[] => [{ id: 1, name: 'Soho', players }];

  it('pro rates salary per point to 15 points', () => {
    const [name] = regulars;
    const [player] = salaries(games, team([{ name, is_open: true }]), 'v2', 'pro_rate');
    expect(player).toEqual({ name, team: 'Soho', salary: lines[name].salary_per_point * 15 });
  });

  it('sums pay on top of a base salary', () => {
    const [name] = regulars;
    const [player] = salaries(games, team([{ name, is_open: true }]), 'v2', 'sum');
    expect(player.salary).toBe(500000 + lines[name].pay);
  });

  it('falls back to the average salary for the same gender', () => {
    const [a, b] = regulars;
    const result = salaries(
      games,
      team([
        { name: a, is_open: true },
        { name: b, is_open: true },
        { name: 'New Guy', is_open: true },
        { name: 'New Woman', is_open: false },
      ]),
      'v2',
      'pro_rate'
    );
    const [sa, sb, newGuy, newWoman] = result.map(p => p.salary);
    expect(newGuy).toBe(pyRound((sa + sb) / 2));
    expect(newWoman).toBe(0); // no women with salaries yet
  });
});

describe('pyRound', () => {
  it('rounds half to even like python', () => {
    expect([0.5, 1.5, 2.5, 62.5, -62.5, -63.5, 2.4, 2.6].map(pyRound)).toEqual([
      0, 2, 2, 62, -62, -64, 2, 3,
    ]);
  });
});
