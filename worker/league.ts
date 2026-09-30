// One Durable Object per league. It owns a small SQLite database holding the
// league's teams, schedule and games. Stats are computed on demand from the
// games' raw events (fast enough that there is nothing to precompute).

import { DurableObject } from 'cloudflare:workers';
import { rollup, salaries, summarize, type GameSummary } from '../shared/stats';
import type { Game, League, LeagueExport, Matchup, Team } from '../shared/types';
import type { Env } from './index';

// Append only. Each entry runs once per league, the first time the league is
// used after a deploy that adds it.
const SCHEMA = [
  `CREATE TABLE teams (id INTEGER PRIMARY KEY, name TEXT NOT NULL, players TEXT NOT NULL);
   CREATE TABLE matchups (
     id INTEGER PRIMARY KEY, week INTEGER, home_team_id INTEGER, away_team_id INTEGER,
     game_start TEXT, game_end TEXT
   );
   CREATE TABLE games (
     id TEXT PRIMARY KEY, week INTEGER NOT NULL, status TEXT NOT NULL, doc TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );`,
];

export type SaveResult = 'created' | 'updated' | 'unchanged' | 'conflict';

// The fields an admin can change when editing a game.
export type GameEdit = Pick<
  Game,
  'week' | 'homeScore' | 'awayScore' | 'homeRoster' | 'awayRoster' | 'points'
>;

export class LeagueObject extends DurableObject<Env> {
  private sql = this.ctx.storage.sql;
  private summaryCache: Map<string, GameSummary> | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => this.migrate());
  }

  private migrate() {
    this.sql.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER)');
    const row = this.sql
      .exec<{ version: number }>('SELECT version FROM schema_version')
      .toArray()[0];
    const version = row?.version ?? 0;
    if (version >= SCHEMA.length) return;

    this.ctx.storage.transactionSync(() => {
      SCHEMA.slice(version).forEach(statement => this.sql.exec(statement));
      this.sql.exec('DELETE FROM schema_version');
      this.sql.exec('INSERT INTO schema_version VALUES (?)', SCHEMA.length);
    });
  }

  // --- reads ---------------------------------------------------------------

  teams(): Team[] {
    return this.sql
      .exec<{ id: number; name: string; players: string }>('SELECT * FROM teams ORDER BY id')
      .toArray()
      .map(t => ({ id: t.id, name: t.name, players: JSON.parse(t.players) }));
  }

  matchups(): Matchup[] {
    return this.sql
      .exec<Record<string, number & string>>('SELECT * FROM matchups ORDER BY game_start, id')
      .toArray()
      .map(m => ({
        id: m.id,
        week: m.week,
        homeTeamId: m.home_team_id,
        awayTeamId: m.away_team_id,
        gameStart: m.game_start,
        gameEnd: m.game_end,
      }));
  }

  // Games in play order. rowid keeps insertion order within a week.
  games(options: { includePoints?: boolean; finalOnly?: boolean } = {}): Game[] {
    const where = options.finalOnly ? "WHERE status = 'final'" : '';
    return this.sql
      .exec<{ doc: string }>(`SELECT doc FROM games ${where} ORDER BY week, rowid`)
      .toArray()
      .map(({ doc }) => {
        const game = JSON.parse(doc) as Game;
        if (!options.includePoints) delete (game as Partial<Game>).points;
        return game;
      });
  }

  game(league: League, id: string) {
    const row = this.sql
      .exec<{ doc: string }>('SELECT doc FROM games WHERE id = ?', id)
      .toArray()[0];
    if (!row) return null;
    const game = JSON.parse(row.doc) as Game;
    return { ...game, stats: rollup([summarize(game)], this.teams(), league.statValues) };
  }

  weeks(): number[] {
    return this.sql
      .exec<{ week: number }>(
        "SELECT DISTINCT week FROM games WHERE status = 'final' ORDER BY week"
      )
      .toArray()
      .map(r => r.week);
  }

  // week = null for the whole season
  stats(league: League, week: number | null) {
    const summaries = [...this.summaries().values()].filter(g => week === null || g.week === week);
    return { week: week ?? 0, stats: rollup(summaries, this.teams(), league.statValues) };
  }

  players(league: League) {
    const summaries = [...this.summaries().values()];
    return salaries(summaries, this.teams(), league.statValues, league.salaryCalc);
  }

  // Upcoming matchups for the stat keeper. `today` is the league's local date (YYYY-MM-DD).
  schedule(today: string) {
    const teams = this.teams();
    const upcoming = this.matchups().filter(m => m.gameStart >= today);
    return { teams, matchups: upcoming.slice(0, Math.floor(teams.length / 2)) };
  }

  export(league: League): LeagueExport {
    return {
      version: 1,
      league,
      teams: this.teams(),
      matchups: this.matchups(),
      games: this.games({ includePoints: true }),
    };
  }

  // Per game stat counts for final games, in play order. Cached until the next write.
  private summaries(): Map<string, GameSummary> {
    if (!this.summaryCache) {
      this.summaryCache = new Map(
        this.games({ includePoints: true, finalOnly: true }).map(g => [g.id, summarize(g)])
      );
    }
    return this.summaryCache;
  }

  // --- writes --------------------------------------------------------------

  private writeGame(game: Game) {
    this.sql.exec(
      `INSERT INTO games (id, week, status, doc, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         week = excluded.week, status = excluded.status, doc = excluded.doc, updated_at = excluded.updated_at`,
      game.id,
      game.week,
      game.status,
      JSON.stringify(game),
      new Date().toISOString()
    );
    this.summaryCache = null;
  }

  // Save a game from the stat keeper. Safe to retry: re-sending the same game is a no-op.
  // Live games can be overwritten; final games can only be changed by an admin edit.
  saveGame(game: Game): SaveResult {
    const row = this.sql
      .exec<{ doc: string; status: string }>('SELECT doc, status FROM games WHERE id = ?', game.id)
      .toArray()[0];

    if (!row) {
      this.writeGame(game);
      return 'created';
    }
    if (row.doc === JSON.stringify(game)) return 'unchanged';
    if (row.status === 'final') return 'conflict';

    this.writeGame(game);
    return 'updated';
  }

  editGame(id: string, edit: GameEdit): boolean {
    const row = this.sql
      .exec<{ doc: string }>('SELECT doc FROM games WHERE id = ?', id)
      .toArray()[0];
    if (!row) return false;

    const { week, homeScore, awayScore, homeRoster, awayRoster, points } = edit;
    const game = JSON.parse(row.doc) as Game;
    this.writeGame({ ...game, week, homeScore, awayScore, homeRoster, awayRoster, points });
    return true;
  }

  deleteGame(id: string): boolean {
    const { rowsWritten } = this.sql.exec('DELETE FROM games WHERE id = ?', id);
    this.summaryCache = null;
    return rowsWritten > 0;
  }

  // Replace rosters and schedule (the Zuluru sync). Games are untouched.
  setRosters(teams: Team[], matchups: Matchup[]) {
    this.ctx.storage.transactionSync(() => this.writeRosters(teams, matchups));
  }

  private writeRosters(teams: Team[], matchups: Matchup[]) {
    this.sql.exec('DELETE FROM teams');
    this.sql.exec('DELETE FROM matchups');
    for (const t of teams) {
      this.sql.exec('INSERT INTO teams VALUES (?, ?, ?)', t.id, t.name, JSON.stringify(t.players));
    }
    for (const m of matchups) {
      this.sql.exec(
        'INSERT INTO matchups VALUES (?, ?, ?, ?, ?, ?)',
        m.id,
        m.week,
        m.homeTeamId,
        m.awayTeamId,
        m.gameStart,
        m.gameEnd
      );
    }
  }

  // Replace everything with an export (used to seed local dev and migrate from v2).
  import(data: LeagueExport) {
    this.ctx.storage.transactionSync(() => {
      this.sql.exec('DELETE FROM games');
      this.writeRosters(data.teams, data.matchups);
      data.games.forEach(game => this.writeGame(game));
    });
    return { teams: data.teams.length, matchups: data.matchups.length, games: data.games.length };
  }
}
