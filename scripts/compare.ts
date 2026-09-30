// Compare the public API of two Parity servers, e.g. v2 vs v3 before cutover:
//
//   node scripts/compare.ts --a http://localhost:8000 --b http://localhost:5173 [--league 24]
//
// Checks teams, salaries, games, weeks, weekly + season stats and every game's
// stats. Differences in representation only (numeric vs string ids, v2's
// android-only fields) are ignored. Delete this once v2 is gone.
//
// Known differences vs v2 (v2 bugs):
// - v2 500s on game pages for leagues 1-5 (events without timestamps)
// - a sub later added to a roster had 2 player rows in v2 and their salary
//   ignored the games they subbed (Nadine Cann in 24, Cassie Berquist in 19)

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { isDeepStrictEqual } from 'node:util';

const { values: args } = parseArgs({
  options: {
    a: { type: 'string', default: 'https://parity.ocua.ca' },
    b: { type: 'string', default: 'http://localhost:5173' },
    league: { type: 'string' },
  },
});

const leagues: { id: number }[] = JSON.parse(
  readFileSync(new URL('../shared/leagues.json', import.meta.url), 'utf-8')
);
const ids = args.league ? [Number(args.league)] : leagues.map(l => l.id);

let failures = 0;
let checks = 0;

for (const id of ids) {
  const compare = async (path: string, normalize: (x: any) => unknown = x => x) => {
    checks++;
    const [a, b] = await Promise.all([get(args.a + path), get(args.b + path)]);
    if (a.error) return console.log(`skip ${path}: ${args.a} ${a.error}`);
    if (!isDeepStrictEqual(normalize(a.body), normalize(b.body))) {
      failures++;
      console.log(`DIFF ${path}`);
      diff(normalize(a.body), normalize(b.body));
    }
  };

  const byName = (xs: { name: string }[]) =>
    Object.fromEntries(xs.map(({ name, ...rest }) => [name, rest]));
  const game = ({ id, league_id: _l, status: _s, points: _p, stats: _st, ...rest }: any) => ({
    id: String(id),
    ...rest,
  });

  await compare(`/api/${id}/teams`, teams =>
    teams.map((t: any) => ({
      ...t,
      players: t.players.map(({ is_male: _, ...p }: any) => p),
    }))
  );
  await compare(`/api/${id}/players`, byName);
  await compare(`/api/${id}/games`, games => games.map(game));
  await compare(`/api/${id}/stats`);

  const weeks = (await get(`${args.b}/api/${id}/weeks`)).body as number[];
  await compare(`/api/${id}/weeks`);
  for (const week of weeks) await compare(`/api/${id}/weeks/${week}`);

  const games = (await get(`${args.b}/api/${id}/games`)).body as { id: string }[];
  for (const g of games) {
    // v2 filled in a missing secondActor with null, v3 returns events as recorded
    const points = (ps: any[]) =>
      ps.map(p => ({ ...p, events: p.events.map((e: any) => ({ secondActor: null, ...e })) }));
    await compare(`/api/${id}/games/${g.id}`, x => ({
      ...game(x),
      stats: x.stats,
      points: points(x.points),
    }));
  }
  console.log(`league ${id}: ${games.length} games, ${weeks.length} weeks`);
}

console.log(`${checks} checks, ${failures} differences`);
process.exit(failures ? 1 : 0);

async function get(url: string): Promise<{ body?: unknown; error?: number }> {
  const res = await fetch(url);
  return res.ok ? { body: await res.json() } : { error: res.status };
}

// print the first few differing paths
function diff(a: unknown, b: unknown, path = '', out = { n: 0 }) {
  if (out.n > 5) return;
  if (isDeepStrictEqual(a, b)) return;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) diff((a as any)[k], (b as any)[k], `${path}.${k}`, out);
  } else {
    out.n++;
    console.log(`  ${path}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
  }
}
