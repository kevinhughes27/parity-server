// Test fixtures, like v2's conftest.py.
//
// Every test starts with a fresh current league holding the four teams in
// rosters.json. The league's Durable Object is set up and read back through
// the admin import and public export endpoints.

import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { currentLeague } from '../shared/leagues';
import type { Game, LeagueExport, Matchup, Team, TeamPlayer } from '../shared/types';
import type { StatLine } from '../shared/stats';
import rosterFixture from '../shared/__tests__/fixtures/rosters.json' with { type: 'json' };

export { expect };

export type Rosters = Record<string, string[]>;

// The league under test, i.e. its Durable Object
export class League {
  constructor(private request: APIRequestContext) {}

  private api = `/api/${currentLeague.id}`;

  // Replace everything in the league
  async reset(teams: Team[], matchups: Matchup[] = []) {
    const data: LeagueExport = { version: 1, league: currentLeague, teams, matchups, games: [] };
    const response = await this.request.post(`${this.api}/import`, {
      data,
      headers: { Authorization: `Basic ${btoa(`admin:${adminPassword()}`)}` },
    });
    expect(response.ok()).toBe(true);
  }

  // Everything the Durable Object holds
  async export(): Promise<LeagueExport> {
    return (await this.request.get(`${this.api}/export`)).json();
  }

  async stats(): Promise<Record<string, StatLine>> {
    return (await (await this.request.get(`${this.api}/stats`)).json()).stats;
  }

  // The game the test recorded (tests only ever submit one)
  async game(): Promise<Game & { stats: Record<string, StatLine> }> {
    const games: Game[] = await (await this.request.get(`${this.api}/games`)).json();
    expect(games).toHaveLength(1);
    return (await this.request.get(`${this.api}/games/${games[0].id}`)).json();
  }

  // Change players on the league's teams, e.g. to set genders
  async updatePlayers(update: (player: TeamPlayer) => TeamPlayer) {
    const { teams, matchups } = await this.export();
    const updated = teams.map(t => ({ ...t, players: t.players.map(update) }));
    await this.reset(updated, matchups);
  }
}

export const test = base.extend<{
  league: League;
  rosters: Rosters;
  matchup: Matchup;
}>({
  league: async ({ request }, use) => {
    await use(new League(request));
  },

  // The teams. Genders are shuffled (8 open, 4 women per team) which sort of
  // ensures we exercise both styles without having to fix the data.
  // Sorry if you get misgendered!
  rosters: [
    async ({ league }, use) => {
      const rosters: Rosters = structuredClone(rosterFixture);
      await league.reset(teamsFor(rosters));
      await use(rosters);
    },
    { auto: true },
  ],

  // An upcoming game between two of the teams
  matchup: async ({ league, rosters }, use) => {
    const teams = teamsFor(rosters);
    const teamId = (name: string) => teams.find(t => t.name === name)!.id;
    const start = new Date(Date.now() + (24 + 19) * 3600_000);
    const end = new Date(start.getTime() + 3600_000);

    const matchup: Matchup = {
      id: 1,
      week: 7,
      homeTeamId: teamId('Kells Angels Bicycle Club'),
      awayTeamId: teamId('lumleysexuals'),
      gameStart: localTime(start),
      gameEnd: localTime(end),
    };
    await league.reset(teams, [matchup]);
    await use(matchup);
  },
});

function teamsFor(rosters: Rosters): Team[] {
  return Object.entries(rosters).map(([name, players], i) => {
    const genders = shuffle([...Array(8).fill(true), ...Array(4).fill(false)]);
    return {
      id: i + 1,
      name,
      players: players.map((player, j) => ({ name: player, is_open: genders[j] })),
    };
  });
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// matchup times are local league time without an offset
function localTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

// The same password the dev server uses (wrangler reads .dev.vars)
function adminPassword() {
  const path = new URL('../.dev.vars', import.meta.url);
  const vars = existsSync(path) ? readFileSync(path, 'utf-8') : '';
  const password = vars.match(/^ADMIN_PASSWORD\s*=\s*"?([^"\n]*)"?/m)?.[1];
  if (!password) throw new Error('ADMIN_PASSWORD missing from .dev.vars (run ./dev setup)');
  return password;
}
