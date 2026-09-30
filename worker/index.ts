// The Worker: routes /api requests to the league's Durable Object and runs the
// daily Zuluru sync. Everything else is static assets (the React app), served
// by Cloudflare before this code runs.

import { LeagueObject, type GameEdit } from './league';
import { fetchZuluru } from './zuluru';
import { currentLeague, devLeague, findLeague, leagues } from '../shared/leagues';
import { fromProduction, seedDevLeague } from './dev';
import type { Game, League, LeagueExport } from '../shared/types';

export { LeagueObject };

export interface Env {
  LEAGUE: DurableObjectNamespace<LeagueObject>;
  ADMIN_PASSWORD: string;
  ZULURU_USER: string;
  ZULURU_PASSWORD: string;
}

const TIME_ZONE = 'America/Toronto';

// Each league is its own Durable Object, named by the league's id. Asking for it
// is all it takes to create it (see Leagues in the README).
const leagueObject = (env: Env, league: League) => env.LEAGUE.getByName(String(league.id));

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (error) {
      console.error(error);
      return json({ error: 'Internal error' }, 500);
    }
  },

  async scheduled(_controller, env) {
    await syncZuluru(env, currentLeague);
  },
} satisfies ExportedHandler<Env>;

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const [prefix, leagueId, resource, id, ...rest] = url.pathname.split('/').filter(Boolean);

  // v2 stat keeper upload. Only kept so open tabs keep working through the cutover.
  if (prefix === 'submit_game' && method === 'POST') {
    const body = (await request.json()) as { league_id: number };
    const league = findLeague(body.league_id);
    if (!league) return json({ error: 'Unknown league' }, 404);
    return saveGame(env, league, crypto.randomUUID(), body);
  }

  if (prefix !== 'api') return json({ error: 'Not found' }, 404);
  if (leagueId === 'leagues' && !resource) return json(leagues);

  const league = leagueId ? findLeague(leagueId) : undefined;
  if (!league || rest.length > 0) return json({ error: 'Not found' }, 404);
  const stub = leagueObject(env, league);

  // development: see worker/dev.ts
  if (import.meta.env.DEV) {
    if (league.id === devLeague.id) await seedDevLeague(stub);
    else if (method === 'GET') return fromProduction(request);
  }

  const route = `${method} ${resource ?? ''}${id ? '/:id' : ''}`;

  switch (route) {
    // --- public reads ---
    case 'GET teams':
      return json(withTeamNames(await stub.teams()));

    case 'GET schedule': {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());
      const { teams, matchups } = await stub.schedule(today);
      return json({ teams: withTeamNames(teams), matchups });
    }

    case 'GET players':
      return json(await stub.players(league));

    case 'GET games': {
      const includePoints = url.searchParams.get('includePoints') === 'true';
      return json(await stub.games({ includePoints }));
    }

    case 'GET games/:id': {
      const game = await stub.game(league, id);
      return game ? json(game) : json({ error: 'Game not found' }, 404);
    }

    case 'GET weeks':
      return json(await stub.weeks());

    case 'GET weeks/:id':
      return json(await stub.stats(league, Number(id)));

    case 'GET stats':
      return json(await stub.stats(league, null));

    case 'GET export':
      return json(await stub.export(league));

    // --- stat keeper ---
    case 'PUT games/:id':
      return saveGame(env, league, id, await request.json());
  }

  // --- admin ---
  if (!ADMIN_ROUTES.has(route)) return json({ error: 'Not found' }, 404);
  if (!(await isAdmin(request, env))) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="parity"' },
    });
  }

  switch (route) {
    case 'POST games/:id': {
      const edit = (await request.json()) as GameEdit;
      return (await stub.editGame(id, edit)) ? json('OK') : json({ error: 'Game not found' }, 404);
    }

    case 'DELETE games/:id':
      return (await stub.deleteGame(id)) ? json('OK') : json({ error: 'Game not found' }, 404);

    case 'POST import':
      return json(await stub.import((await request.json()) as LeagueExport));

    case 'POST zuluru_sync':
      try {
        return json(await syncZuluru(env, league));
      } catch (error) {
        return json({ error: String(error) }, 502);
      }
  }

  return json({ error: 'Not found' }, 404);
}

const ADMIN_ROUTES = new Set([
  'POST games/:id',
  'DELETE games/:id',
  'POST import',
  'POST zuluru_sync',
]);

async function saveGame(env: Env, league: League, id: string, body: unknown) {
  const game = parseGame(body, league, id);
  if (typeof game === 'string') return json({ error: game }, 400);

  const result = await leagueObject(env, league).saveGame(game);
  if (result === 'conflict') {
    return json({ error: 'Game is already final. Ask an admin to edit it.' }, 409);
  }
  return json({ id, result }, result === 'created' ? 201 : 200);
}

// Light validation of an uploaded game. Returns an error message if invalid.
function parseGame(body: unknown, league: League, id: string): Game | string {
  const g = body as Partial<Game> | null;
  if (!g || typeof g !== 'object') return 'Expected a JSON object';
  if (!id || id.length > 64) return 'Invalid game id';

  // numbers, or numeric strings like v2 accepted
  const num = (x: unknown) => (typeof x === 'string' && x.trim() !== '' ? Number(x) : x);
  const [week, homeScore, awayScore] = [g.week, g.homeScore, g.awayScore].map(num);
  for (const [key, value] of Object.entries({ week, homeScore, awayScore })) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return `${key} must be a number`;
  }
  for (const key of ['homeTeam', 'awayTeam'] as const) {
    if (typeof g[key] !== 'string') return `${key} must be a string`;
  }
  for (const key of ['homeRoster', 'awayRoster'] as const) {
    if (!Array.isArray(g[key])) return `${key} must be a list of names`;
  }
  const pointsOk =
    Array.isArray(g.points) &&
    g.points.every(
      p =>
        Array.isArray(p?.events) &&
        Array.isArray(p.offensePlayers) &&
        Array.isArray(p.defensePlayers)
    );
  if (!pointsOk) return 'points must be a list of points';

  return {
    id,
    league_id: league.id,
    status: g.status === 'live' ? 'live' : 'final',
    week: week as number,
    homeTeam: g.homeTeam!,
    awayTeam: g.awayTeam!,
    homeRoster: g.homeRoster!,
    awayRoster: g.awayRoster!,
    homeScore: homeScore as number,
    awayScore: awayScore as number,
    points: g.points!,
  };
}

async function syncZuluru(env: Env, league: League) {
  if (!league.zuluru) throw new Error(`League ${league.id} has no zuluru url`);
  const { teams, matchups } = await fetchZuluru(
    league.zuluru,
    env.ZULURU_USER,
    env.ZULURU_PASSWORD
  );
  await leagueObject(env, league).setRosters(teams, matchups);
  console.log(
    `Zuluru sync: league ${league.id}, ${teams.length} teams, ${matchups.length} matchups`
  );
  return { teams: teams.length, matchups: matchups.length };
}

// v2 included the team name on each player
function withTeamNames(teams: Awaited<ReturnType<LeagueObject['teams']>>) {
  return teams.map(t => ({ ...t, players: t.players.map(p => ({ ...p, team: t.name })) }));
}

async function isAdmin(request: Request, env: Env) {
  if (!env.ADMIN_PASSWORD) return false;
  const given = request.headers.get('Authorization') ?? '';
  const expected = 'Basic ' + btoa(`admin:${env.ADMIN_PASSWORD}`);
  // compare digests so the comparison is constant time and equal length
  const [a, b] = await Promise.all(
    [given, expected].map(s => crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))
  );
  return crypto.subtle.timingSafeEqual(a, b);
}

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    // the data is public, let anyone build on it
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
