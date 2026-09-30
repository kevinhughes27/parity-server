// Copy leagues from one Parity server into another.
//
// By default this copies the current league from production into your local
// dev server (`./dev up` must be running):
//
//   ./dev seed                   # current league
//   ./dev seed --all             # every league
//   ./dev seed --league 19       # one league
//   ./dev seed --from https://parity.ocua.ca --to https://parity-staging.example.workers.dev
//
// The source is a v3 server (its /export endpoint) or a v2 sqlite database
// (`--from v2.sqlite`, used to migrate from parity-server). Importing replaces
// the league's data on the target and needs the target's admin password:
// ADMIN_PASSWORD from the env or .dev.vars.

import { readFileSync, existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import type { League, LeagueExport } from '../shared/types.ts';

const { values: args } = parseArgs({
  options: {
    from: { type: 'string', default: 'https://parity.ocua.ca' },
    to: { type: 'string', default: 'http://localhost:5173' },
    all: { type: 'boolean', default: false },
    league: { type: 'string' },
  },
});

const leagues: League[] = JSON.parse(
  readFileSync(new URL('../shared/leagues.json', import.meta.url), 'utf-8')
);

const selected = args.all
  ? leagues
  : args.league
    ? leagues.filter(l => l.id === Number(args.league))
    : [leagues[0]];

if (selected.length === 0) throw new Error(`Unknown league ${args.league}`);

const password = process.env.ADMIN_PASSWORD ?? readDevVars().ADMIN_PASSWORD;
if (!password) throw new Error('Set ADMIN_PASSWORD (or add it to .dev.vars)');
const auth = 'Basic ' + Buffer.from(`admin:${password}`).toString('base64');

for (const league of selected) {
  process.stdout.write(`${league.id} ${league.name}: `);
  const data = await fetchLeague(args.from, league);

  const res = await fetch(`${args.to}/api/${league.id}/import`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`import failed: ${res.status} ${await res.text()}`);
  console.log(await res.json());
}

async function fetchLeague(from: string, league: League): Promise<LeagueExport> {
  if (from.endsWith('.sqlite')) return readV2(from, league);
  return (await get(`${from}/api/${league.id}/export`)) as LeagueExport;
}

// Read a league from the v2 (parity-server) database
function readV2(path: string, league: League): LeagueExport {
  const db = new DatabaseSync(path, { readOnly: true });
  const all = (sql: string, ...params: number[]) =>
    db.prepare(sql).all(...params) as Record<string, string & number>[];
  // v2 stored "2026-03-15 18:00:00.000000"
  const time = (t: string) => t.slice(0, 19).replace(' ', 'T');

  return {
    version: 1,
    league,
    teams: all('SELECT id, name FROM team WHERE league_id = ? ORDER BY id', league.id).map(t => ({
      id: t.id,
      name: t.name,
      players: all('SELECT name, gender FROM player WHERE team_id = ? ORDER BY id', t.id).map(
        p => ({ name: p.name, is_open: p.gender === 'male' })
      ),
    })),
    matchups: all('SELECT * FROM matchup WHERE league_id = ? ORDER BY id', league.id).map(m => ({
      id: m.id,
      week: m.week,
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      gameStart: time(m.game_start),
      gameEnd: time(m.game_end),
    })),
    games: all('SELECT * FROM game WHERE league_id = ? ORDER BY id', league.id).map(g => ({
      id: String(g.id),
      league_id: league.id,
      status: 'final',
      week: g.week,
      homeTeam: g.home_team,
      awayTeam: g.away_team,
      homeRoster: JSON.parse(g.home_roster),
      awayRoster: JSON.parse(g.away_roster),
      homeScore: g.home_score,
      awayScore: g.away_score,
      points: JSON.parse(g.points),
    })),
  };
}

async function get(url: string): Promise<unknown> {
  const res = await fetch(url);
  // v2 has no /export (it answers with the react app or an error)
  if (!res.ok || !res.headers.get('content-type')?.includes('json')) {
    throw new Error(
      `GET ${url}: ${res.status}. Is it a v3 server? To copy from v2 use --from path/to/v2.sqlite`
    );
  }
  return res.json();
}

function readDevVars(): Record<string, string> {
  const path = new URL('../.dev.vars', import.meta.url);
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf-8')
      .split('\n')
      .map(line => line.match(/^\s*([\w]+)\s*=\s*"?(.*?)"?\s*$/))
      .filter(m => m !== null)
      .map(m => [m[1], m[2]])
  );
}
