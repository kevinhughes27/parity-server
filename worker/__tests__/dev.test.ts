// The dev league (worker/dev.ts). Tests run in development mode like `./dev up`.

import { exports } from 'cloudflare:workers';
import { expect, it } from 'vitest';
import { currentLeague, devLeague } from '../../shared/leagues';

const get = async (path: string) =>
  (await exports.default.fetch(`http://parity.test/api/${devLeague.id}${path}`)).json() as any;

it('is the current league in development', () => {
  expect(currentLeague).toBe(devLeague);
});

it('fills itself with teams, a schedule and games the first time it is used', async () => {
  const teams = await get('/teams');
  expect(teams.map((t: any) => t.name)).toEqual([
    'Kells Angels Bicycle Club',
    '99 Problems',
    'lumleysexuals',
    'Soho',
  ]);
  expect(teams[0].players.filter((p: any) => !p.is_open)).toHaveLength(4);

  const games = await get('/games');
  expect(games.map((g: any) => g.id)).toEqual(['dev-1', 'dev-2']);
  expect(Object.keys((await get('/stats')).stats)).toHaveLength(48);

  // upcoming games for the stat keeper
  const { matchups } = await get('/schedule');
  expect(matchups).toHaveLength(2);
  expect(matchups[0].gameStart > new Date().toISOString().slice(0, 10)).toBe(true);
});
