# Agent notes

Read the README first, it explains how everything works. This file is the extra context for picking up the work: where things stand, what hasn't been verified, the decisions behind the design and the gotchas.

## Status

Parity 3.0 is a rewrite of [parity-server](https://github.com/kevinhughes27/parity-server) (v2: Python/FastAPI + SQLite on EC2, an Android app) as a Cloudflare Worker with a Durable Object per league. It was built on the `v3` branch of parity-server and will move to a new repo (see History in the README).

Done and verified:

- Stats and salaries ported to TypeScript (`shared/stats.ts`). They match v2's snapshots and v2's stats table for all 996 games, and `scripts/compare.ts` found v2 and v3 API responses identical across all 24 leagues except two v2 salary bugs (listed in the script).
- The Worker API, league Durable Object, Zuluru scraper (league and division pages), dev league, seed and compare scripts.
- v2's e2e stat keeper tests ported to Playwright (`e2e/`), all 21 passing.
- The README covers development, deploying, the v2 migration plan, hosting and forking.

Not done yet:

- **Nothing is deployed.** Production is still v2 at https://parity.ocua.ca. The migration plan is the "Moving from v2" section of the README (hosting on Kevin's own Cloudflare account + domain, `parity.ocua.ca` as a Cloudflare for SaaS custom hostname via a CNAME from OCUA).
- **The new repo.** Kevin is undecided between a fresh root commit and full history. The README's History section assumes the fresh start (graft instructions).
- The commits on `v3` are unsigned (made from a sandbox with no gpg).

Never verified (the sandbox had no podman, no Cloudflare account and couldn't reach parity.ocua.ca):

- `./dev` itself, including `./dev e2e` in the Playwright image. Every command it wraps was run directly on Node 24.
- The GitHub Actions workflow (`.github/workflows/ci.yml`).
- `wrangler deploy`, secrets, the custom hostname setup and the `*/*` route in `wrangler.jsonc`.
- The Zuluru login (needs real credentials). Parsing was tested against real public pages (teams lists, schedules) and a saved roster page.
- Dev mode reading real leagues from production (`worker/dev.ts`). Tested against a local v2 server instead.

Follow ups:

- After the cutover: delete `scripts/compare.ts`, the v2 sqlite reader in `scripts/seed.ts`, the `/submit_game` route in `worker/index.ts` and the "Moving from v2" README section.
- Sub genders aren't uploaded by the stat keeper (rosters are just names), see the `custom substitutes` e2e test.
- Live games: the API accepts `"status": "live"` and keeps live games out of stats but the stat keeper doesn't send it. Kevin wants this left for later (see Ideas in the README).
- Ratio warnings in the stat keeper are disabled (commented cases in `e2e/rules.spec.ts`).

## Decisions

- **One Durable Object per league, named by the league id** (`worker/index.ts` `leagueObject`). Leagues never read each other. Another organization forks and deploys their own rather than sharing a deployment. League ids are permanent.
- **`shared/leagues.json` is the registry**, bundled into the app and the Worker. The first entry is the current league. `zuluru` is the url of the Zuluru page listing the teams, a league or a division page (OCUA sets seasons up both ways).
- **No stats table.** A game is stored as one JSON doc (`games.doc`), stats are computed on read and cached in memory until the next write.
- **Game ids are strings.** v2 games keep their numeric ids ("123"), new games get a uuid from the stat keeper. `PUT /api/:league/games/:id` is idempotent: identical re-uploads succeed, a changed upload of a final game is a 409 (admins edit with POST).
- **The Zuluru sync only touches the current league** and stops a week after its last scheduled game, so finished seasons keep their rosters.
- **Dev league** (id 0, `worker/dev.ts`): only in development, seeds itself, is the current league. Real leagues are read from production in dev, writes stay local. Tests (vitest) also run in development mode so they use it.
- **Kept v2's API shapes** so the React app barely changed. v2 quirks kept on purpose: Python's round half to even (`pyRound`), stat values v1/v2, salary calcs.
- **No ESLint.** `tsc` checks unused locals/params. Prettier config lives in `package.json`, vitest config in `vite.config.ts`. Kevin dislikes top level clutter.

## Working on it

- Use `./dev` (podman) for everything, Kevin doesn't want node running on his machine. `./dev check` and `./dev e2e` before committing (in a sandbox without podman: `yarn type-check && yarn format:check && yarn test && yarn e2e`).
- Never write to production. Dev mode can only read it. `scripts/seed.ts` writes wherever `--to` points.
- `v2.sqlite` (git ignored, a copy of v2's database) is what seeding for the migration reads. Refresh it from production right before the cutover.
- Style: small, plain code with comments that explain why. The README is hand written, no hard wrapped lines, and it's fine for it to explain Cloudflare concepts for newcomers.
- The SQL schema (`SCHEMA` in `worker/league.ts`) is append only, each entry runs once per Durable Object. `migrations` in `wrangler.jsonc` is for Durable Object classes, not tables.

## Gotchas

- JSON imports need `with { type: 'json' }`. Playwright runs tests as native Node ESM.
- `shared/leagues.ts` uses `import.meta.env?.DEV` (optional) because Node (e2e, scripts) has no `import.meta.env`. Worker code uses `import.meta.env.DEV` so vite can drop dev code from production builds; check `dist/` if you touch it.
- The Cloudflare vite plugin handles requests before vite's `server.proxy`, which is why dev reads from production in the Worker (`worker/dev.ts`) and not in vite config.
- The root `cloudflare()` vite plugin is disabled under vitest (`!process.env.VITEST`), the worker test project uses `cloudflareTest()` instead.
- e2e tests share one league so they run one at a time. The e2e server is a production build with in memory storage (`E2E=1` sets `persistState: false`) on port 5174.
- Wrangler reads secrets from `.dev.vars` if it exists and only then falls back to `process.env`. CI writes a `.dev.vars`.
- v2 events from 2014-2017 have no timestamps and some have no `secondActor`. Keep them as recorded.
- Nested `ctx.storage.transactionSync` calls aren't documented, so we avoid them (see `writeRosters` vs `setRosters` in `worker/league.ts`).
