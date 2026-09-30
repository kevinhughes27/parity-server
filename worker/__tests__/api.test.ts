// API tests against the real Worker + Durable Object (in workerd).
//
// Tests run in development mode (like `./dev up`) so they use the dev league,
// the only local one. Reading any other league would go to production.
// Replaces v2's test_api.py / test_admin.py.

import { exports } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { leagues } from '../../shared/leagues';
import type { LeagueExport, Team } from '../../shared/types';
import rosters from '../../shared/fixtures/rosters.json';
import miniGame from '../../shared/fixtures/mini_game.json';
import miniGame2 from '../../shared/fixtures/mini_game2.json';
import miniGameEdited from '../../shared/fixtures/mini_game_edited.json';
import snapshots from '../../shared/fixtures/v2_snapshots.json';

const league = leagues[0];
const api = `http://parity.test/api/${league.id}`;
const admin = { Authorization: 'Basic ' + btoa('admin:test') };

const request = (url: string, init?: RequestInit) => exports.default.fetch(url, init);
const getJson = async (url: string) => (await request(url)).json() as Promise<any>;
const send = (method: string, url: string, body: unknown, headers = {}) =>
  request(url, { method, body: JSON.stringify(body), headers });

const teams: Team[] = Object.entries(rosters).map(([name, players], i) => ({
  id: i + 1,
  name,
  players: players.map((p, j) => ({ name: p, is_open: j % 3 !== 0 })),
}));

const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);

const seed: LeagueExport = {
  version: 1,
  league,
  teams,
  matchups: [
    {
      id: 1,
      week: 1,
      homeTeamId: 1,
      awayTeamId: 2,
      gameStart: '2020-01-01T18:00:00',
      gameEnd: '2020-01-01T19:00:00',
    },
    {
      id: 2,
      week: 2,
      homeTeamId: 1,
      awayTeamId: 3,
      gameStart: `${tomorrow}T18:00:00`,
      gameEnd: `${tomorrow}T19:00:00`,
    },
  ],
  games: [],
};

beforeEach(async () => {
  const res = await send('POST', `${api}/import`, seed, admin);
  expect(res.status).toBe(200);
  // upload like the stat keeper does
  expect((await send('PUT', `${api}/games/one`, miniGame)).status).toBe(201);
  expect((await send('PUT', `${api}/games/two`, miniGame2)).status).toBe(201);
});

describe('public api', () => {
  it('lists leagues', async () => {
    expect(await getJson('http://parity.test/api/leagues')).toEqual(leagues);
  });

  it('serves teams, players, games, weeks and stats', async () => {
    const teamsRes = await getJson(`${api}/teams`);
    expect(teamsRes).toHaveLength(4);
    expect(teamsRes[0].players[0]).toEqual({ ...teams[0].players[0], team: teams[0].name });

    expect(await getJson(`${api}/players`)).toHaveLength(48);

    const games = await getJson(`${api}/games`);
    expect(games.map((g: any) => g.id)).toEqual(['one', 'two']);
    expect(games[0].points).toBeUndefined();
    expect((await getJson(`${api}/games?includePoints=true`))[0].points).toHaveLength(4);

    const game = await getJson(`${api}/games/one`);
    expect(game.points).toHaveLength(4);
    expect(Object.keys(game.stats)).toHaveLength(24);

    expect(await getJson(`${api}/weeks`)).toEqual([1]);
    expect(Object.keys((await getJson(`${api}/weeks/1`)).stats)).toHaveLength(48);

    const stats = await getJson(`${api}/stats`);
    expect(stats.week).toBe(0);
    expect(Object.keys(stats.stats)).toHaveLength(48);
  });

  it('only schedules upcoming matchups', async () => {
    const schedule = await getJson(`${api}/schedule`);
    expect(schedule.teams).toHaveLength(4);
    expect(schedule.matchups.map((m: any) => m.id)).toEqual([2]);
  });

  it('exports everything', async () => {
    const data = await getJson(`${api}/export`);
    expect(data.teams).toEqual(teams);
    expect(data.matchups).toEqual(seed.matchups);
    expect(data.games.map((g: any) => [g.id, g.status, g.points.length])).toEqual([
      ['one', 'final', 4],
      ['two', 'final', 2],
    ]);
  });

  it('404s unknown leagues, games and routes', async () => {
    expect((await request('http://parity.test/api/999/stats')).status).toBe(404);
    expect((await request(`${api}/games/nope`)).status).toBe(404);
    expect((await request(`${api}/nope`)).status).toBe(404);
  });
});

describe('stat keeper uploads', () => {
  it('is safe to retry', async () => {
    const res = await send('PUT', `${api}/games/one`, miniGame);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'one', result: 'unchanged' });
  });

  it('will not overwrite a final game', async () => {
    const res = await send('PUT', `${api}/games/one`, { ...miniGame, homeScore: 9 });
    expect(res.status).toBe(409);
  });

  it('keeps live games out of stats until final', async () => {
    const live = { ...miniGame, week: 2, status: 'live' };
    expect((await send('PUT', `${api}/games/live`, live)).status).toBe(201);
    expect((await send('PUT', `${api}/games/live`, { ...live, homeScore: 3 })).status).toBe(200);
    expect(await getJson(`${api}/weeks`)).toEqual([1]);

    expect((await send('PUT', `${api}/games/live`, { ...live, status: 'final' })).status).toBe(200);
    expect(await getJson(`${api}/weeks`)).toEqual([1, 2]);
  });

  it('rejects invalid games', async () => {
    const res = await send('PUT', `${api}/games/bad`, { ...miniGame, points: 'nope' });
    expect(res.status).toBe(400);
  });

  it('accepts v2 uploads', async () => {
    const res = await send('POST', 'http://parity.test/submit_game', {
      ...miniGame,
      league_id: league.id,
    });
    expect(res.status).toBe(201);
    expect(await getJson(`${api}/games`)).toHaveLength(3);
  });
});

describe('admin', () => {
  it('requires the admin password', async () => {
    for (const [method, path] of [
      ['POST', '/games/one'],
      ['DELETE', '/games/one'],
      ['POST', '/import'],
      ['POST', '/zuluru_sync'],
    ]) {
      expect((await send(method, api + path, {})).status).toBe(401);
      const wrong = { Authorization: 'Basic ' + btoa('admin:wrong') };
      expect((await send(method, api + path, {}, wrong)).status).toBe(401);
    }
  });

  // v2 test_edit
  it('edits a game', async () => {
    await send('DELETE', `${api}/games/two`, null, admin);

    const before = (await getJson(`${api}/stats`)).stats;
    expect(before['Brian Kells'].pulls).toBe(1);
    expect(before['Scott Higgins'].pulls).toBe(0);

    const res = await send('POST', `${api}/games/one`, miniGameEdited, admin);
    expect(res.status).toBe(200);

    const after = await getJson(`${api}/stats`);
    expect(after.stats['Brian Kells'].pulls).toBe(0);
    expect(after.stats['Scott Higgins'].pulls).toBe(1);
    expect(after).toEqual(snapshots.test_edit);
  });

  it('deletes a game', async () => {
    expect((await send('DELETE', `${api}/games/one`, null, admin)).status).toBe(200);
    expect((await send('DELETE', `${api}/games/one`, null, admin)).status).toBe(404);
    expect(await getJson(`${api}/games`)).toHaveLength(1);
  });

  it('only syncs the current league with zuluru', async () => {
    const past = leagues.find(l => l.id !== league.id)!;
    const res = await send('POST', `http://parity.test/api/${past.id}/zuluru_sync`, null, admin);
    expect(res.status).toBe(400);
  });

  it('reports zuluru sync failures without touching rosters', async () => {
    const res = await send('POST', `${api}/zuluru_sync`, null, admin);
    expect(res.status).toBe(502);
    expect(await getJson(`${api}/teams`)).toHaveLength(4);
  });
});
